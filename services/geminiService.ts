import { GoogleGenAI, Type, Chat } from "@google/genai";
import { UserPreferences, Recipe } from "../types";

let ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const setApiKey = (key: string) => {
    ai = new GoogleGenAI({ apiKey: key });
};

// Keep a reference to the chat session
let chatSession: Chat | null = null;

// Helper to construct BMI string
const getBmiInfo = (prefs: UserPreferences) => {
    let bmiInfo = "";
    if (prefs.height && prefs.weight) {
        const h = prefs.height / 100;
        const w = prefs.weight;
        if (!isNaN(h) && !isNaN(w) && h > 0) {
            const bmi = (w / (h*h)).toFixed(1);
            bmiInfo = `BMI: ${bmi}, Height: ${prefs.height}cm, Weight: ${prefs.weight}kg, Age: ${prefs.age}, Gender: ${prefs.gender}`;
        }
    }
    return bmiInfo;
};

// Define Schema centrally to reuse
const RECIPE_SCHEMA = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        cuisine: { type: Type.STRING, description: "Style of cooking, inferred from location" },
        prepTime: { type: Type.NUMBER },
        cookTime: { type: Type.NUMBER },
        difficulty: { type: Type.STRING },
        calories: { type: Type.NUMBER },
        protein: { type: Type.NUMBER },
        carbs: { type: Type.NUMBER },
        fats: { type: Type.NUMBER },
        matchReason: { type: Type.STRING, description: "Detailed reason linking BMI and Location to recipe" },
        authorUid: { type: Type.STRING },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        allergens: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              amount: { type: Type.STRING },
            }
          }
        },
        instructions: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        knowledgeGraph: {
          type: Type.OBJECT,
          properties: {
              nodes: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          id: { type: Type.STRING },
                          label: { type: Type.STRING },
                          type: { type: Type.STRING, enum: ['Root', 'Ingredient', 'Effect', 'BodyCondition', 'LocationFactor'] }
                      }
                  }
              },
              links: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          source: { type: Type.STRING },
                          target: { type: Type.STRING },
                          label: { type: Type.STRING }
                      }
                  }
              }
          }
        }
      }
    }
  };

export const getDishImageUrl = (title: string, cuisine: string): string => {
    // Simple hash function to get a deterministic number
    let hash = 0;
    const str = title + cuisine;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    const seed = Math.abs(hash);
    return `https://loremflickr.com/800/600/food?lock=${seed}`;
};

export const generateRecipes = async (prefs: UserPreferences, targetCalories: number): Promise<Recipe[]> => {
  const model = "gemini-3-flash-preview";
  
  const bmiInfo = getBmiInfo(prefs);

    const prompt = `
    你是一位结合了现代营养学和中医智慧的顶级行政总厨及健康专家。
    请根据用户的详细健康档案，生成 3 个独特的个性化食谱。
    
    【用户档案】
    1. 生理参数: 性别 ${prefs.gender}, 年龄 ${prefs.age}, 身高 ${prefs.height}cm, 体重 ${prefs.weight}kg, 活动量 ${prefs.activityLevel}, 目标 ${prefs.healthGoal}
       -> ${bmiInfo}
       -> 建议单餐热量目标: 约 ${targetCalories} kcal
    2. 健康禁忌: 过敏原 [${prefs.allergies.join(', ') || '无'}], 慢性病 [${prefs.chronicDiseases.join(', ') || '无'}], 服药情况 [${prefs.medications || '无'}]
    3. 饮食偏好: 口味 [${prefs.flavorPreferences.join(', ') || '无'}], 饮食流派 [${prefs.dietType}], 厌恶食物 [${prefs.dislikedFoods.join(', ') || '无'}]
    4. 生活方式: 厨艺 [${prefs.cookingSkill}], 备餐时间限制 [${prefs.prepTimeLimit}分钟], 预算 [${prefs.budget}], 用餐场景 [${prefs.diningContext}]

    **核心要求：**
    1. **精准营养推算**：首先，你必须在内部逻辑中根据用户的身高、体重、年龄、性别和活动量，推算出该用户一天所需的总热量（TDEE），以及蛋白质、脂肪、碳水化合物、维生素等核心营养素的每日推荐摄入量。
    2. **科学推荐理由**：在每道菜的 \`matchReason\` 和 \`description\` 中，**必须明确写出**你推算出的该用户每日营养需求（例如：“根据您的身高体重，您每日需要约XX克蛋白质、XX克脂肪...”），并详细解释这道菜的营养成分（蛋白质、碳水、脂肪等）是如何精确匹配并满足这些身体需求的。这是推荐这道菜的最核心理由。
    3. **精准推荐**：食谱必须严格遵守上述红线（无过敏原、无厌恶食物、符合时间限制）。
    4. **营养达标**：每道菜的热量应尽量接近 ${targetCalories} kcal，并在 \`protein\`, \`carbs\`, \`fats\` 字段中填入准确的克数。
    5. **知识图谱数据**：生成微型“知识图谱(Knowledge Graph)”数据结构。
    6. **中文输出**：所有内容必须使用简体中文。
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RECIPE_SCHEMA
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No data returned from Gemini");
    }
    
    return JSON.parse(jsonText) as Recipe[];
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const refineRecipes = async (prefs: UserPreferences, instruction: string): Promise<Recipe[]> => {
    const model = "gemini-3-flash-preview";

    const bmiInfo = getBmiInfo(prefs);

    const prompt = `
      你是一位顶级健康大厨。你之前根据用户的详细档案生成了一份菜单。
      现在，用户对菜单提出了**修改意见**。请根据新的指令，**重新生成** 3 个全新的食谱。
      
      【用户档案】
      - 生理参数: ${bmiInfo}
      - 目标: ${prefs.healthGoal}
      - 禁忌: 过敏原 [${prefs.allergies.join(', ') || '无'}], 厌恶食物 [${prefs.dislikedFoods.join(', ') || '无'}]
  
      **用户的新指令/修改意见**: "${instruction}"
      
      **核心要求：**
      1. **精准营养推算**：根据用户的身高、体重、年龄等，推算其每日所需的蛋白质、脂肪、碳水化合物等营养素。在 \`matchReason\` 和 \`description\` 中明确说明这些计算结果，并解释新食谱如何满足这些需求。
      2. 必须严格遵守用户的新指令。
      3. 仍然不能偏离健康的底线（绝不能包含过敏原和厌恶食物），并考虑用户的 BMI 状况。
      4. 必须生成包含 KnowledgeGraph 的完整数据结构。
      5. 必须使用简体中文。
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: RECIPE_SCHEMA
        }
      });
  
      const jsonText = response.text;
      if (!jsonText) throw new Error("No data");
      return JSON.parse(jsonText) as Recipe[];
    } catch (error) {
      console.error("Gemini Refine Error:", error);
      throw error;
    }
};

export const generateHealthAdvice = async (prefs: UserPreferences, recipes: Recipe[]): Promise<string> => {
    const model = "gemini-3-flash-preview";
    const bmiInfo = getBmiInfo(prefs);
    const recipeNames = recipes.map(r => r.title).join('、');

    const prompt = `
      你是一位专业的健康顾问。用户刚刚生成了一份专属食谱。
      【用户数据】
      - 生理参数: ${bmiInfo}
      - 目标: ${prefs.healthGoal}
      - 慢性病: ${prefs.chronicDiseases.join(', ')}
      【本次食谱】
      ${recipeNames}

      请根据以上信息，给用户写一段专业、详尽的健康建议（约200字）。
      必须包含以下内容：
      1. 简述根据用户的身高、体重、年龄等推算出的每日营养需求（热量、蛋白质、碳水、脂肪等）。
      2. 解释为什么推荐的食谱组合是合理的，它们是如何精确满足这些身体需求的。
      3. 重点指出他们当前的身体状况（如BMI偏高/偏低）需要注意什么，以及这份食谱将如何帮助他们达成目标。
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text || "保持健康饮食，规律作息。";
    } catch (error) {
        console.error("Gemini Advice Error:", error);
        return "保持健康饮食，规律作息，祝您身体健康！";
    }
};

export const generateTrendAdvice = async (historyData: any[]): Promise<string> => {
    const model = "gemini-3-flash-preview";
    
    // Format history data for the prompt (already oldest to newest)
    const historySummary = historyData.map((record, index) => {
        const date = record.createdAt?.toDate ? record.createdAt.toDate().toLocaleDateString() : `记录 ${index + 1}`;
        const weight = record.preferences.weight;
        const bmi = record.preferences.bmi || '未知';
        const goal = record.preferences.healthGoal;
        const recipes = record.recipes.map((r: any) => r.title).join('、');
        return `[${date}] 体重: ${weight}kg, BMI: ${bmi}, 目标: ${goal}, 生成食谱: ${recipes}`;
    }).join('\n');

    const prompt = `
      你是一位专业的健康顾问和营养师。用户正在查看他们的"健康档案"历史记录。
      以下是用户最近几次生成食谱时的身体数据和历史记录（按时间顺序，从旧到新）：
      
      ${historySummary}

      请根据这些历史数据，给用户写一段专业、详尽的**阶段性健康趋势分析与建议**（约300字）。
      必须包含以下内容：
      1. **趋势分析**：分析用户体重、BMI的变化趋势（如果有变化），或者指出他们坚持记录的习惯。
      2. **饮食回顾**：结合他们过去生成的食谱类型和健康目标，评价他们的饮食方向是否正确。
      3. **下一步建议**：基于当前的趋势，为他们接下来的饮食和生活方式提供具体的、可操作的建议（例如：是否需要调整热量、增加某种营养素、或者改变运动量）。
      4. 语气要鼓励、专业、充满关怀。
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text || "保持健康饮食，规律作息，继续记录您的健康数据！";
    } catch (error) {
        console.error("Gemini Trend Advice Error:", error);
        return "保持健康饮食，规律作息，继续记录您的健康数据！";
    }
};

export const chatWithChef = async (
    message: string, 
    context: { prefs?: UserPreferences, recipe?: Recipe }
): Promise<string> => {
    const model = "gemini-3-flash-preview";

    // Initialize chat session if it doesn't exist
    if (!chatSession) {
        chatSession = ai.chats.create({
            model: model,
            config: {
                systemInstruction: "你是一位专业、友好且富有中医智慧的营养师和私人大厨。请根据用户的身体情况、健康目标以及他们正在查看的食谱来回答问题。你的回答应当简明扼要，具有指导意义。",
            }
        });
    }

    let contextPrompt = "";
    if (context.recipe) {
        contextPrompt += `\n[当前上下文 - 用户正在查看食谱]\n标题: ${context.recipe.title}\n描述: ${context.recipe.description}\n推荐理由: ${context.recipe.matchReason}\n\n`;
    }
    
    if (context.prefs) {
        contextPrompt += `\n[当前上下文 - 用户资料]\n目标: ${context.prefs.healthGoal}\n禁忌: ${context.prefs.allergies.join(',')}\n\n`;
    }

    const fullMessage = `${contextPrompt}用户问题: ${message}`;

    try {
        const result = await chatSession.sendMessage({ message: fullMessage });
        return result.text || "抱歉，我走神了，请再说一遍。";
    } catch (e) {
        console.error("Chat Error", e);
        return "网络连接似乎有点问题，请稍后再试。";
    }
}