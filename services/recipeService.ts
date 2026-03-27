import { Recipe, UserPreferences } from '../types';
import { generateRecipes as aiGenerateRecipes } from './geminiService';
import { db } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

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
        case '维持现状':
        default: break;
    }

    // Ensure minimum safe calories (1200 for women, 1500 for men)
    const minCals = prefs.gender === '男' ? 1500 : 1200;
    targetDailyCalories = Math.max(targetDailyCalories, minCals);

    // Assuming 3 meals a day, return per-meal target
    return Math.round(targetDailyCalories / 3);
};

export const getRecipesFromDB = async (prefs: UserPreferences, targetCalories: number): Promise<Recipe[]> => {
  try {
    const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const recipes: Recipe[] = [];
    querySnapshot.forEach((doc) => {
      recipes.push({ id: doc.id, ...doc.data() } as Recipe);
    });

    // Filter based on preferences
    const filtered = recipes.filter(recipe => {
      // 1. Exclude allergens
      if (prefs.allergies && prefs.allergies.length > 0) {
        const hasAllergen = recipe.allergens?.some((a: string) => prefs.allergies.includes(a));
        if (hasAllergen) return false;
      }
      
      // 2. Exclude disliked foods
      if (prefs.dislikedFoods && prefs.dislikedFoods.length > 0) {
        const hasDisliked = recipe.ingredients?.some((ing: any) => 
          prefs.dislikedFoods.some((d: string) => ing.name.includes(d))
        );
        if (hasDisliked) return false;
      }

      // 3. Check prep time limit
      const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
      if (prefs.prepTimeLimit && totalTime > prefs.prepTimeLimit) {
        return false;
      }

      // 4. Check target calories (allow +/- 20% variance)
      if (targetCalories && recipe.calories) {
        const minCal = targetCalories * 0.8;
        const maxCal = targetCalories * 1.2;
        if (recipe.calories < minCal || recipe.calories > maxCal) {
          return false;
        }
      }

      // 5. Check health goal (must be in tags)
      if (prefs.healthGoal && recipe.tags) {
        if (!recipe.tags.includes(prefs.healthGoal)) {
          return false;
        }
      }

      // 6. Check diet type (must be in tags if not '无特殊')
      if (prefs.dietType && prefs.dietType !== '无特殊' && recipe.tags) {
        if (!recipe.tags.includes(prefs.dietType)) {
          return false;
        }
      }

      return true;
    });

    // Shuffle and pick top 3
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  } catch (error) {
    console.error("Error fetching recipes from Firestore:", error);
    return [];
  }
};

export const saveRecipeToDB = async (recipe: Recipe): Promise<string | null> => {
    try {
        const recipeData = {
          ...recipe,
          createdAt: serverTimestamp()
        };
        // Remove undefined id if present
        delete recipeData.id;
        
        const docRef = await addDoc(collection(db, 'recipes'), recipeData);
        return docRef.id;
    } catch (error) {
        console.error("Error saving recipe to Firestore:", error);
        return null;
    }
}

export const generateAndSaveRecipes = async (prefs: UserPreferences): Promise<Recipe[]> => {
    const targetCalories = calculateTargetCalories(prefs);

    // 1. Try to get from DB first
    let dbRecipes: Recipe[] = [];
    try {
        dbRecipes = await getRecipesFromDB(prefs, targetCalories);
    } catch (e) {
        console.warn("Failed to fetch from DB, proceeding to generate with AI:", e);
    }
    
    // If we found enough recipes in the DB, return them
    if (dbRecipes.length >= 3) {
        console.log("Found recipes in DB!");
        return dbRecipes;
    }

    // 2. If not enough, generate using AI
    console.log("Not enough recipes in DB, generating with AI...");
    
    // Pass the target calories to the AI service
    const generatedRecipes = await aiGenerateRecipes(prefs, targetCalories);

    // 3. Save the newly generated recipes to the DB for future use
    const savedRecipes = await Promise.all(generatedRecipes.map(async (recipe) => {
        // Ensure tags exist
        if (!recipe.tags) recipe.tags = [];
        if (prefs.healthGoal) recipe.tags.push(prefs.healthGoal);
        if (prefs.dietType !== '无特殊') recipe.tags.push(prefs.dietType);
        
        let id = undefined;
        try {
            const savedId = await saveRecipeToDB(recipe);
            if (savedId) id = savedId;
        } catch (e) {
            console.warn("Failed to save recipe to DB, skipping save.", e);
        }
        return { ...recipe, id };
    }));

    return savedRecipes;
};
