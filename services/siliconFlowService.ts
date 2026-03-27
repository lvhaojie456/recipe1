import OpenAI from 'openai';
import { UserPreferences, Recipe } from "../types";

let openaiClient: OpenAI | null = null;

const getOpenAIClient = () => {
  if (!openaiClient) {
    const apiKey = import.meta.env.VITE_SILICONFLOW_API_KEY || import.meta.env.SILICONFLOW_API_KEY;
    console.log("SiliconFlow API Key exists:", !!apiKey);
    if (!apiKey) {
      console.warn("SILICONFLOW_API_KEY is not set. Please set it in your environment variables.");
    }
    openaiClient = new OpenAI({
      apiKey: apiKey || 'dummy-key-to-prevent-crash',
      baseURL: 'https://api.siliconflow.cn/v1',
      dangerouslyAllowBrowser: true
    });
  }
  return openaiClient;
};

// Keep a reference to the chat session messages
let chatHistory: any[] = [];

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
  const model = "deepseek-ai/DeepSeek-V3";

  const prompt = `
    你是一位结合了现代营养学和中医智慧的顶级行政总厨及健康专家。
    请根据用户的详细健康档案，生成 3 个独特的个性化食谱。
    
    【用户档案】
    1. 生理参数: 性别 ${prefs.gender}, 年龄 ${prefs.age}, 身高 ${prefs.height}cm, 体重 ${prefs.weight}kg, 活动量 ${prefs.activityLevel}, 目标 ${prefs.healthGoal}
       -> 用户的 BMI 为 ${((prefs.weight) / (Math.pow(prefs.height / 100, 2))).toFixed(1)}。请根据 BMI 状态（偏瘦/正常/超重/肥胖）精准调整营养配比。
       -> 建议单餐热量目标: 约 ${targetCalories} kcal
    2. 地理位置: ${prefs.location || '未知'}
       -> 请根据用户所在位置推荐当地、应季的食材。地理位置对食谱的影响应大于一般的“菜系偏好”。
    3. 健康禁忌: 过敏原 [${prefs.allergies.join(', ') || '无'}], 慢性病 [${prefs.chronicDiseases.join(', ') || '无'}], 服药情况 [${prefs.medications || '无'}]
       -> 绝对红线：食谱中绝对不能包含过敏原。如果有慢性病（如糖尿病），必须低GI；如果有高血压，必须低钠。
    4. 饮食偏好: 口味 [${prefs.flavorPreferences.join(', ') || '无'}], 饮食流派 [${prefs.dietType}], 厌恶食物 [${prefs.dislikedFoods.join(', ') || '无'}]
       -> 绝对红线：食谱中绝对不能包含厌恶食物。
    5. 生活方式: 厨艺 [${prefs.cookingSkill}], 备餐时间限制 [${prefs.prepTimeLimit}分钟], 预算 [${prefs.budget}], 用餐场景 [${prefs.diningContext}]

    **核心要求：**
    1. **精准推荐**：食谱必须严格遵守上述红线（无过敏原、无厌恶食物、符合时间限制）。
    2. **BMI与位置导向**：比起用户选择的“菜系”，更应优先考虑 BMI 对应的营养需求和地理位置对应的应季食材。
    3. **知识图谱数据**：对于每个食谱，必须生成一个微型“知识图谱(Knowledge Graph)”数据结构。
       - 节点(Node)类型应包括：Root(食谱名), Ingredient(核心食材), Effect(功效/作用), BodyCondition(针对的身体状况), LocationFactor(地理/环境因素)。
       - 连线(Link)应描述它们之间的逻辑关系。
    4. **标签与过敏原**：在 tags 数组中放入口味、流派、适合的慢性病等标签。在 allergens 数组中列出该菜品可能含有的常见过敏原（如果有的话，但绝不能是用户过敏的）。
    5. **中文输出**：所有内容必须使用简体中文。
    6. **JSON格式**：请返回一个JSON对象，包含一个名为 "recipes" 的数组，不要包含任何额外的文本或Markdown标记。结构如下：
    {
      "recipes": [
        {
          "title": "食谱名",
          "description": "描述",
          "cuisine": "菜系",
          "prepTime": 10,
          "cookTime": 20,
          "difficulty": "简单",
          "calories": 500,
          "protein": 30,
          "carbs": 50,
          "fats": 20,
          "matchReason": "推荐理由",
          "authorUid": "",
          "tags": ["标签1", "标签2"],
          "allergens": ["过敏原1"],
          "ingredients": [{"name": "食材1", "amount": "100g"}],
          "instructions": ["步骤1", "步骤2"],
          "knowledgeGraph": {
            "nodes": [{"id": "1", "label": "节点1", "type": "Root"}],
            "links": [{"source": "1", "target": "2", "label": "关系"}]
          }
        }
      ]
    }
  `;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }
    });

    const jsonText = response.choices[0].message.content;
    if (!jsonText) {
      throw new Error("No data returned from SiliconFlow");
    }
    
    const parsed = JSON.parse(jsonText);
    return parsed.recipes as Recipe[];
  } catch (error) {
    console.error("SiliconFlow API Error:", error);
    throw error;
  }
};

export const refineRecipes = async (prefs: UserPreferences, instruction: string): Promise<Recipe[]> => {
    const model = "deepseek-ai/DeepSeek-V3";

    const prompt = `
      你是一位顶级健康大厨。你之前根据用户的详细档案生成了一份菜单。
      现在，用户对菜单提出了**修改意见**。请根据新的指令，**重新生成** 3 个全新的食谱。
      
      【用户档案】
      - 目标: ${prefs.healthGoal}
      - 禁忌: 过敏原 [${prefs.allergies.join(', ') || '无'}], 厌恶食物 [${prefs.dislikedFoods.join(', ') || '无'}]
  
      **用户的新指令/修改意见**: "${instruction}"
      
      **核心要求：**
      1. 必须严格遵守用户的新指令。
      2. 仍然不能偏离健康的底线（绝不能包含过敏原和厌恶食物）。
      3. 必须生成包含 KnowledgeGraph 的完整数据结构。
      4. 必须使用简体中文。
      5. **JSON格式**：请返回一个JSON对象，包含一个名为 "recipes" 的数组，不要包含任何额外的文本或Markdown标记。结构与之前相同。
    `;
  
    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      });
  
      const jsonText = response.choices[0].message.content;
      if (!jsonText) throw new Error("No data");
      
      const parsed = JSON.parse(jsonText);
      return parsed.recipes as Recipe[];
    } catch (error) {
      console.error("SiliconFlow Refine Error:", error);
      throw error;
    }
};

export const chatWithChef = async (
    message: string, 
    context: { prefs?: UserPreferences, recipe?: Recipe }
): Promise<string> => {
    const model = "deepseek-ai/DeepSeek-V3";

    // Initialize chat session if it doesn't exist
    if (chatHistory.length === 0) {
        chatHistory.push({
            role: "system",
            content: "你是一位专业、友好且富有中医智慧的营养师和私人大厨。请根据用户的身体情况、健康目标以及他们正在查看的食谱来回答问题。你的回答应当简明扼要，具有指导意义。"
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
    chatHistory.push({ role: "user", content: fullMessage });

    try {
        const response = await getOpenAIClient().chat.completions.create({
            model: model,
            messages: chatHistory
        });
        
        const reply = response.choices[0].message.content || "抱歉，我走神了，请再说一遍。";
        chatHistory.push({ role: "assistant", content: reply });
        return reply;
    } catch (e) {
        console.error("Chat Error", e);
        return "网络连接似乎有点问题，请稍后再试。";
    }
}

export const analyzeHealthTrends = async (history: Recipe[]): Promise<string> => {
    const model = "deepseek-ai/DeepSeek-V3";

    const historyData = history.map(r => ({
        date: r.createdAt,
        prefs: r.searchPrefs,
        recipeTitle: r.title
    }));

    const prompt = `
      你是一位顶级健康管理专家、数据分析师和资深营养学家。
      以下是用户过去一段时间内的饮食偏好、身体参数（包括 BMI）和地理位置的历史记录。
      请利用你的硅基流动分析能力，结合医学知识和大数据趋势，提供一份极具洞察力的健康趋势报告。
      
      【历史记录】
      ${JSON.stringify(historyData, null, 2)}
      
      【分析要求】
      1. **身体参数深度分析**：分析用户的体重、BMI 等生理参数的变化趋势。如果 BMI 持续偏高或偏低，请给出医学层面的解释。
      2. **环境与地理因素**：结合用户所在位置的历史变化（如有），分析环境因素（如气候、当地饮食习惯）对用户健康的影响。
      3. **饮食偏好与营养缺口**：观察用户选择食谱的规律，指出其可能存在的微量元素缺乏或宏量营养素失衡。
      4. **硅基流动预测与预警**：基于历史数据，预测如果保持现状，用户未来 3-6 个月的健康状态。针对潜在的慢性病风险给出预警。
      5. **知识图谱式建议**：请用逻辑严密的语言描述建议，就像在构建一个知识图谱。例如：“因为 A（环境/习惯），导致 B（身体反应），所以建议 C（行动）”。
      6. **个性化行动计划**：提供未来 2 周的阶梯式改进建议。
      7. **语气**：权威、精准、富有前瞻性。
      8. **语言**：简体中文。
    `;

    try {
        const response = await getOpenAIClient().chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: prompt }]
        });

        return response.choices[0].message.content || "暂时无法生成分析报告。";
    } catch (error) {
        console.error("Health Analysis Error:", error);
        return "分析过程中出现错误，请稍后再试。";
    }
};

