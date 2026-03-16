import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize SQLite Database
const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    cuisine TEXT,
    prepTime INTEGER,
    cookTime INTEGER,
    difficulty TEXT,
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fats INTEGER,
    ingredients TEXT,
    instructions TEXT,
    matchReason TEXT,
    knowledgeGraph TEXT,
    authorUid TEXT,
    searchPrefs TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    tags TEXT,
    allergens TEXT
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    uid TEXT PRIMARY KEY,
    siliconflow_api_key TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Local Auth Endpoints
app.post("/api/auth/register", (req, res) => {
  try {
    console.log("Registration request:", req.body);
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    const uid = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const stmt = db.prepare('INSERT INTO users (uid, username, password) VALUES (?, ?, ?)');
    stmt.run(uid, username, hashedPassword);

    console.log("User registered:", username, uid);
    res.json({ uid, username, success: true });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: "用户名已存在" });
    }
    console.error("Registration error:", error);
    res.status(500).json({ error: "注册失败: " + error.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    console.log("Login request:", req.body);
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const stmt = db.prepare('SELECT uid, username FROM users WHERE username = ? AND password = ?');
    const user = stmt.get(username, hashedPassword);

    if (user && typeof user === 'object') {
      console.log("Login successful:", username);
      res.json(Object.assign({}, user, { success: true }));
    } else {
      console.log("Login failed: Invalid credentials for", username);
      res.status(401).json({ error: "用户名或密码错误" });
    }
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "登录失败: " + error.message });
  }
});

// User Settings Endpoints
app.post("/api/settings/apikey", (req, res) => {
  try {
    const { uid, apiKey } = req.body;
    if (!uid || !apiKey) {
      return res.status(400).json({ error: "UID and API Key are required" });
    }

    const stmt = db.prepare(`
      INSERT INTO user_settings (uid, siliconflow_api_key, updatedAt) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(uid) DO UPDATE SET 
      siliconflow_api_key = excluded.siliconflow_api_key,
      updatedAt = CURRENT_TIMESTAMP
    `);
    stmt.run(uid, apiKey);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Save API key error:", error);
    res.status(500).json({ error: "Failed to save API key" });
  }
});

app.get("/api/settings/apikey/:uid", (req, res) => {
  try {
    const { uid } = req.params;
    const stmt = db.prepare('SELECT siliconflow_api_key FROM user_settings WHERE uid = ?');
    const result = stmt.get(uid) as { siliconflow_api_key: string } | undefined;
    
    if (result && result.siliconflow_api_key) {
      res.json({ apiKey: result.siliconflow_api_key });
    } else {
      res.status(404).json({ error: "API key not found" });
    }
  } catch (error: any) {
    console.error("Get API key error:", error);
    res.status(500).json({ error: "Failed to get API key" });
  }
});

// Get recipes matching preferences
app.post("/api/recipes/search", (req, res) => {
  try {
    const authorUid = req.body ? req.body.authorUid : undefined;
    const prefs = req.body ? JSON.parse(JSON.stringify(req.body)) : {};
    if (prefs.authorUid) delete prefs.authorUid;
    
    let query = 'SELECT * FROM recipes';
    let params: any[] = [];

    if (authorUid) {
      query += ' WHERE authorUid = ?';
      params.push(authorUid);
    }

    query += ' ORDER BY createdAt DESC LIMIT 50';
    
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    
    // Parse JSON fields
    const recipes = rows.map((row: any) => Object.assign({}, row, {
      ingredients: JSON.parse(row.ingredients || '[]'),
      instructions: JSON.parse(row.instructions || '[]'),
      knowledgeGraph: JSON.parse(row.knowledgeGraph || '{"nodes":[],"links":[]}'),
      tags: JSON.parse(row.tags || '[]'),
      allergens: JSON.parse(row.allergens || '[]'),
      searchPrefs: JSON.parse(row.searchPrefs || '{}')
    }));

    // Filter based on preferences (only if prefs are provided)
    const filtered = recipes.filter(recipe => {
      if (Object.keys(prefs).length === 0) return true;

      // Exclude allergens
      if (prefs.allergies && prefs.allergies.length > 0) {
        const hasAllergen = recipe.allergens?.some((a: string) => prefs.allergies.includes(a));
        if (hasAllergen) return false;
      }
      // Exclude disliked foods
      if (prefs.dislikedFoods && prefs.dislikedFoods.length > 0) {
        const hasDisliked = recipe.ingredients?.some((ing: any) => 
          prefs.dislikedFoods.some((d: string) => ing.name.includes(d))
        );
        if (hasDisliked) return false;
      }
      return true;
    });

    res.json(filtered.slice(0, 3)); // Return top 3
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save a new recipe
app.post("/api/recipes", (req, res) => {
  try {
    const recipe = req.body;
    const id = recipe.id || crypto.randomUUID();
    
    const stmt = db.prepare(`
      INSERT INTO recipes (
        id, title, description, cuisine, prepTime, cookTime, difficulty, 
        calories, protein, carbs, fats, ingredients, instructions, 
        matchReason, knowledgeGraph, authorUid, tags, allergens, searchPrefs
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      id,
      recipe.title,
      recipe.description,
      recipe.cuisine,
      recipe.prepTime,
      recipe.cookTime,
      recipe.difficulty,
      recipe.calories,
      recipe.protein,
      recipe.carbs,
      recipe.fats,
      JSON.stringify(recipe.ingredients || []),
      JSON.stringify(recipe.instructions || []),
      recipe.matchReason,
      JSON.stringify(recipe.knowledgeGraph || {nodes:[], links:[]}),
      recipe.authorUid || null,
      JSON.stringify(recipe.tags || []),
      JSON.stringify(recipe.allergens || []),
      JSON.stringify(recipe.searchPrefs || {})
    );

    res.json({ id, success: true });
  } catch (error) {
    console.error("Error saving recipe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
