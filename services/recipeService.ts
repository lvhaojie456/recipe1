import { Recipe, UserPreferences } from '../types';
import { generateRecipes as aiGenerateRecipes } from './geminiService';

const getLocalUser = () => {
    const savedUser = localStorage.getItem('chefgenie_user');
    return savedUser ? JSON.parse(savedUser) : null;
};

// Calculate Target Calories per meal (assuming 3 meals a day)
const calculateTargetCalories = (prefs: UserPreferences): number => {
    // 1. Calculate BMR (Mifflin-St Jeor)
    let bmr = 10 * prefs.weight + 6.25 * prefs.height - 5 * prefs.age;
    bmr += (prefs.gender === '男') ? 5 : -161;

    // 2. Activity Multiplier
    const activityMultipliers: Record<string, number> = {
        '久坐': 1.2,
        '轻度活动': 1.375,
        '中度活动': 1.55,
        '重度活动': 1.725,
        '极重度活动': 1.9
    };
    const tdee = bmr * (activityMultipliers[prefs.activityLevel] || 1.2);

    // 3. Goal Adjustment
    let targetDailyCalories = tdee;
    switch (prefs.healthGoal) {
        case '减脂': targetDailyCalories -= 500; break;
        case '增肌': targetDailyCalories += 300; break;
        case '备孕': targetDailyCalories += 300; break;
        case '术后恢复': targetDailyCalories += 200; break;
        case '控制三高': targetDailyCalories -= 200; break;
        default: break;
    }

    // Ensure minimum safe calories (1200 for women, 1500 for men)
    const minCals = prefs.gender === '男' ? 1500 : 1200;
    targetDailyCalories = Math.max(targetDailyCalories, minCals);

    // Assuming 3 meals a day, return per-meal target
    return Math.round(targetDailyCalories / 3);
};

export const getRecipesFromDB = async (prefs: UserPreferences): Promise<Recipe[]> => {
  try {
    const user = getLocalUser();
    const response = await fetch('/api/recipes/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...prefs, authorUid: user?.uid })
    });
    
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || contentType.indexOf("application/json") === -1) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const recipes: Recipe[] = await response.json();
    return recipes;
  } catch (error) {
    console.error("Error fetching recipes from SQLite:", error);
    return [];
  }
};

export const saveRecipeToDB = async (recipe: Recipe, prefs?: UserPreferences): Promise<string | null> => {
    try {
        const user = getLocalUser();
        const response = await fetch('/api/recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...recipe, authorUid: user?.uid, searchPrefs: prefs || recipe.searchPrefs })
        });
        
        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType || contentType.indexOf("application/json") === -1) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.id;
    } catch (error) {
        console.error("Error saving recipe to SQLite:", error);
        return null;
    }
}

export const generateAndSaveRecipes = async (prefs: UserPreferences): Promise<Recipe[]> => {
    let dbRecipes: Recipe[] = [];
    try {
        dbRecipes = await getRecipesFromDB(prefs);
    } catch (e) {
        console.warn("Failed to fetch from DB, proceeding to generate with AI:", e);
    }
    
    if (dbRecipes.length >= 3) {
        return dbRecipes;
    }

    const targetCalories = calculateTargetCalories(prefs);
    const generatedRecipes = await aiGenerateRecipes(prefs, targetCalories);

    const savedRecipes = await Promise.all(generatedRecipes.map(async (recipe) => {
        if (!recipe.tags) recipe.tags = [];
        if (prefs.healthGoal) recipe.tags.push(prefs.healthGoal);
        if (prefs.dietType !== '无特殊') recipe.tags.push(prefs.dietType);
        
        let id = undefined;
        try {
            const savedId = await saveRecipeToDB(recipe, prefs);
            if (savedId) id = savedId;
        } catch (e) {
            console.warn("Failed to save recipe to DB, skipping save.", e);
        }
        return { ...recipe, id };
    }));

    return savedRecipes;
};

export const getHistoryRecipes = async (): Promise<Recipe[]> => {
    const user = getLocalUser();
    if (!user) throw new Error('User not authenticated');

    try {
        const response = await fetch('/api/recipes/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authorUid: user.uid })
        });
        
        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType || contentType.indexOf("application/json") === -1) {
            throw new Error('Failed to fetch history');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching history from SQLite:", error);
        return [];
    }
};
