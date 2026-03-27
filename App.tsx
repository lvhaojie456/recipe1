import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { handleFirestoreError, OperationType } from './utils/firebaseUtils';
import PhoneLogin from './components/PhoneLogin';
import { ChefHat, Activity } from './components/Icons';
import PreferenceForm from './components/PreferenceForm';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import ChatWidget from './components/ChatWidget';
import MenuAdjuster from './components/MenuAdjuster';
import HistoryView from './components/HistoryView';
import { refineRecipes, generateHealthAdvice } from './services/geminiService'; // Import generateHealthAdvice
import { generateAndSaveRecipes } from './services/recipeService';
import { UserPreferences, Recipe, ViewState } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [viewState, setViewState] = useState<ViewState>(ViewState.FORM);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPreferences | undefined>(undefined);
  const [initialPrefs, setInitialPrefs] = useState<Partial<UserPreferences> | undefined>(undefined);
  const [currentAdvice, setCurrentAdvice] = useState<string | null>(null); // State for advice
  
  // State for the adjuster
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.height && data.weight) {
              setInitialPrefs({
                height: data.height,
                weight: data.weight,
                bmi: data.bmi
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch user profile", err);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      handleStartOver();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleFormSubmit = async (prefs: UserPreferences) => {
    setViewState(ViewState.LOADING);
    setError(null);
    setUserPrefs(prefs); // Save prefs for context
    
    // Save height, weight, bmi to Firestore
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          height: prefs.height,
          weight: prefs.weight,
          bmi: prefs.bmi
        });
      } catch (err) {
        console.error("Failed to update user profile", err);
        // We don't block the recipe generation if this fails
      }
    }

    try {
      // Use the new service that checks DB first, then generates
      const generatedRecipes = await generateAndSaveRecipes(prefs);
      setRecipes(generatedRecipes);
      
      // Generate advice and save history
      if (user) {
          try {
              const advice = await generateHealthAdvice(prefs, generatedRecipes);
              setCurrentAdvice(advice);
              
              const historyRef = collection(db, 'users', user.uid, 'history');
              await addDoc(historyRef, {
                  createdAt: serverTimestamp(),
                  preferences: prefs,
                  recipes: generatedRecipes,
                  healthAdvice: advice
              });
          } catch (err) {
              console.error("Failed to save history", err);
          }
      }

      setViewState(ViewState.RESULTS);
    } catch (err) {
      console.error("Failed to generate recipes:", err);
      setError("暂时无法生成食谱，请检查您的网络或 API 密钥后重试。");
      setViewState(ViewState.ERROR);
    }
  };

  const handleMenuAdjustment = async (instruction: string) => {
      if (!userPrefs) return;
      
      setIsAdjusting(true);
      try {
          // Keep current view but update data
          const newRecipes = await refineRecipes(userPrefs, instruction);
          setRecipes(newRecipes);
      } catch (err) {
          console.error("Failed to refine", err);
          setError("调整失败，请稍后再试");
          setViewState(ViewState.ERROR);
      } finally {
          setIsAdjusting(false);
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
    setCurrentAdvice(null);
    setViewState(ViewState.FORM);
    setIsAdjusting(false);
  };

  const handleViewHistory = () => {
    setViewState(ViewState.HISTORY);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <PhoneLogin />;
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
            {viewState !== ViewState.HISTORY && (
              <button 
                onClick={handleViewHistory}
                className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors flex items-center gap-1"
              >
                <Activity className="w-4 h-4" />
                健康档案
              </button>
            )}
            {viewState === ViewState.RESULTS && !selectedRecipe && (
               <button 
                  onClick={handleStartOver}
                  className="text-sm font-medium text-gray-500 hover:text-brand-600 transition-colors"
               >
                  重新开始
               </button>
            )}
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 pb-24"> 
        
        {/* VIEW: FORM */}
        {viewState === ViewState.FORM && (
          <div className="animate-in fade-in zoom-in duration-500">
            <PreferenceForm onSubmit={handleFormSubmit} isSubmitting={false} initialPrefs={initialPrefs} />
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

        {/* VIEW: HISTORY */}
        {viewState === ViewState.HISTORY && (
          <HistoryView onBack={handleStartOver} />
        )}

        {/* VIEW: RESULTS LIST */}
        {viewState === ViewState.RESULTS && !selectedRecipe && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* The AI Adjuster Bar */}
            <MenuAdjuster onAdjust={handleMenuAdjustment} isAdjusting={isAdjusting} />

            {/* Health Advice Banner */}
            {currentAdvice && (
              <div className="bg-gradient-to-r from-orange-50 to-brand-50 border border-brand-100 p-6 rounded-3xl shadow-sm mb-8">
                <h3 className="text-sm font-bold text-brand-700 mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  专属健康建议
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {currentAdvice}
                </p>
              </div>
            )}

            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">您的菜单</h2>
                <p className="text-gray-500">根据您的偏好精心挑选。</p>
            </div>
            
            {/* Recipes Grid - Opacity transition during adjustment */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 transition-opacity duration-300 ${isAdjusting ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
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

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 text-sm border-t border-gray-100 mt-auto">
        <p>© {new Date().getFullYear()} BJTU.</p>
      </footer>

      {/* Global Chat Widget */}
      <ChatWidget prefs={userPrefs} selectedRecipe={selectedRecipe} />
    </div>
  );
};

export default App;