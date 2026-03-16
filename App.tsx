import React, { useState, useEffect } from 'react';
import { ChefHat, Activity } from 'lucide-react';
import PreferenceForm from './components/PreferenceForm';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import ChatWidget from './components/ChatWidget';
import MenuAdjuster from './components/MenuAdjuster';
import Login from './components/Login';
import HealthAnalysis from './components/HealthAnalysis';
import ApiSettings from './components/ApiSettings';
import { Sliders } from './components/Icons';
import { refineRecipes, setApiKey } from './services/geminiService';
import { generateAndSaveRecipes } from './services/recipeService';
import { getHistoryRecipes } from './services/recipeService';
import { UserPreferences, Recipe, ViewState } from './types';
import { useAuth } from './services/authService';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.FORM);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPreferences | undefined>(undefined);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    const checkApiKey = async () => {
      if (!user) return;
      try {
        const response = await fetch(`/api/settings/apikey/${user.uid}`);
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          if (data.apiKey) {
            setApiKey(data.apiKey);
          }
        }
      } catch (error) {
        console.error("Failed to check API key", error);
      }
    };
    
    if (user) {
        checkApiKey();
    }
  }, [user]);

  const handleFormSubmit = async (prefs: UserPreferences) => {
    setViewState(ViewState.LOADING);
    setError(null);
    setUserPrefs(prefs);
    try {
      const generatedRecipes = await generateAndSaveRecipes(prefs);
      setRecipes(generatedRecipes);
      setViewState(ViewState.RESULTS);
    } catch (err) {
      console.error("Failed to generate recipes:", err);
      setError("暂时无法生成食谱，请检查您的网络或 API 密钥后重试。");
      setViewState(ViewState.ERROR);
    }
  };

  const handleViewHistory = async () => {
    setViewState(ViewState.LOADING);
    try {
      const history = await getHistoryRecipes();
      setRecipes(history);
      setViewState(ViewState.RESULTS);
    } catch (err) {
      setError("无法加载历史食谱");
      setViewState(ViewState.ERROR);
    }
  };

  const handleShowAnalysis = async () => {
    setViewState(ViewState.LOADING);
    try {
      const history = await getHistoryRecipes();
      setRecipes(history);
      setViewState(ViewState.ANALYSIS);
    } catch (err) {
      setError("无法加载分析数据");
      setViewState(ViewState.ERROR);
    }
  };

  const handleMenuAdjustment = async (instruction: string) => {
      if (!userPrefs) return;
      
      try {
          const newRecipes = await refineRecipes(userPrefs, instruction);
          setRecipes(newRecipes);
      } catch (err) {
          console.error("Failed to refine", err);
          setError("调整失败，请稍后再试");
          setViewState(ViewState.ERROR);
      }
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    window.scrollTo(0, 0);
  };

  const handleBackToResults = () => {
    setSelectedRecipe(null);
  };

  const handleStartOver = () => {
    setRecipes([]);
    setSelectedRecipe(null);
    setUserPrefs(undefined);
    setViewState(ViewState.FORM);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-orange-100 sticky top-0 z-40 shadow-sm/50 backdrop-blur-md bg-white/90">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={handleStartOver}
          >
            <div className="bg-brand-500 p-1.5 rounded-lg text-white group-hover:bg-brand-600 transition-colors">
                 <ChefHat className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-orange-500">
              BJTU
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsApiSettingsOpen(true)} className="text-sm font-medium text-gray-500 hover:text-brand-600 flex items-center gap-1">
              <Sliders className="w-4 h-4" />
              API 设置
            </button>
            <button onClick={handleViewHistory} className="text-sm font-medium text-gray-500 hover:text-brand-600">历史食谱</button>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:inline">你好, {user.username}</span>
              <button 
                onClick={logout}
                className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 pb-24"> 
        
        {/* VIEW: FORM */}
        {viewState === ViewState.FORM && (
          <div className="animate-in fade-in zoom-in duration-500">
            <PreferenceForm onSubmit={handleFormSubmit} isSubmitting={false} />
          </div>
        )}

        {/* VIEW: LOADING */}
        {viewState === ViewState.LOADING && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 animate-pulse">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <ChefHat className="w-6 h-6 text-brand-500" />
                </div>
            </div>
            <p className="text-xl font-medium text-gray-600">正在咨询顶级大厨...</p>
            <p className="text-sm text-gray-400">为您定制专属食谱中。</p>
          </div>
        )}

        {/* VIEW: ERROR */}
        {viewState === ViewState.ERROR && (
          <div className="text-center max-w-md mx-auto p-8 bg-red-50 rounded-2xl border border-red-100">
            <div className="text-red-500 mb-4 flex justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">哎呀！出错了。</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
                onClick={handleStartOver}
                className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
            >
                重试
            </button>
          </div>
        )}

        {/* VIEW: RESULTS LIST */}
        {viewState === ViewState.RESULTS && !selectedRecipe && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* The AI Adjuster Bar */}
            <MenuAdjuster onAdjust={handleMenuAdjustment} isAdjusting={false} />

            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">您的菜单</h2>
                <p className="text-gray-500">根据您的偏好精心挑选。</p>
                <button 
                  onClick={handleShowAnalysis}
                  className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-bold shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
                >
                  <Activity className="w-4 h-4" />
                  查看健康趋势分析
                </button>
            </div>
            
            {/* Recipes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {recipes.map((recipe, index) => (
                <RecipeCard 
                  key={index} 
                  index={index}
                  recipe={recipe} 
                  onClick={() => handleRecipeClick(recipe)} 
                />
              ))}
            </div>
          </div>
        )}

        {/* VIEW: DETAIL */}
        {viewState === ViewState.RESULTS && selectedRecipe && (
          <RecipeDetail 
            recipe={selectedRecipe} 
            onBack={handleBackToResults} 
          />
        )}

        {/* VIEW: ANALYSIS */}
        {viewState === ViewState.ANALYSIS && (
          <HealthAnalysis 
            history={recipes} 
            onBack={() => setViewState(ViewState.RESULTS)} 
          />
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 text-sm border-t border-gray-100 mt-auto">
        <p>© {new Date().getFullYear()} BJTU.</p>
      </footer>

      {/* Global Chat Widget */}
      <ChatWidget prefs={userPrefs} selectedRecipe={selectedRecipe} />

      {/* API Settings Modal */}
      <ApiSettings isOpen={isApiSettingsOpen} onClose={() => setIsApiSettingsOpen(false)} />
    </div>
  );
};

export default App;
