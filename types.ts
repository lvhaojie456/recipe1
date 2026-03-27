export interface UserPreferences {
  // 1. 基础生理参数
  gender: '男' | '女' | '其他';
  age: number;
  height: number; // cm
  weight: number; // kg
  bmi?: number; // Added bmi
  activityLevel: '久坐' | '轻度活动' | '中度活动' | '重度活动' | '极重度活动';
  healthGoal: '减脂' | '增肌' | '维持现状' | '备孕' | '术后恢复' | '控制三高';

  // 2. 健康状况与禁忌
  allergies: string[];
  chronicDiseases: string[];
  medications: string;

  // 3. 饮食习惯与偏好
  flavorPreferences: string[];
  dietType: string;
  dislikedFoods: string[];

  // 4. 生活方式与场景
  cookingSkill: '厨房小白' | '偶尔做饭' | '烹饪达人';
  prepTimeLimit: number; // minutes
  diningContext: '自己做' | '点外卖' | '经常应酬';
  budget: '平价' | '适中' | '高端';
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface KGNode {
  id: string;
  label: string;
  type: 'Root' | 'Ingredient' | 'Effect' | 'BodyCondition' | 'LocationFactor';
}

export interface KGLink {
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeGraphData {
  nodes: KGNode[];
  links: KGLink[];
}

export interface Recipe {
  id?: string; // Added for Firestore document ID
  title: string;
  description: string;
  cuisine: string;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: Ingredient[];
  instructions: string[];
  matchReason: string;
  knowledgeGraph: KnowledgeGraphData; // New field for KG
  authorUid?: string;
  createdAt?: any; // Firestore Timestamp
  tags: string[];
  allergens?: string[]; // For strict exclusion
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'user' | 'admin';
  createdAt?: any; // Firestore Timestamp
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface HistoryRecord {
  id?: string;
  createdAt: any;
  preferences: UserPreferences;
  recipes: Recipe[];
  healthAdvice: string;
}

export enum ViewState {
  FORM = 'FORM',
  LOADING = 'LOADING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR',
  HISTORY = 'HISTORY'
}