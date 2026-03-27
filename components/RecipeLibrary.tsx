import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import { getDishImageUrl } from '../services/geminiService';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';

interface RecipeLibraryProps {
  onBack: () => void;
}

const RecipeLibrary: React.FC<RecipeLibraryProps> = ({ onBack }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('500');
  const [protein, setProtein] = useState('20');
  const [carbs, setCarbs] = useState('50');
  const [fats, setFats] = useState('15');
  const [tags, setTags] = useState('减脂, 中餐');
  const [ingredients, setIngredients] = useState('鸡胸肉, 西兰花');
  const [instructions, setInstructions] = useState('1. 切块\n2. 煮熟');

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data: Recipe[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Recipe);
      });
      setRecipes(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个食谱吗？')) return;
    try {
      await deleteDoc(doc(db, 'recipes', id));
      setRecipes(recipes.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecipe = {
      title,
      description,
      cuisine: '自定义',
      prepTime: 10,
      cookTime: 15,
      difficulty: '简单',
      calories: Number(calories),
      protein: Number(protein),
      carbs: Number(carbs),
      fats: Number(fats),
      ingredients: ingredients.split(',').map(i => ({ name: i.trim(), amount: '适量' })),
      instructions: instructions.split('\n').filter(i => i.trim()),
      matchReason: '用户手动添加的本地食谱',
      knowledgeGraph: { nodes: [], links: [] },
      tags: tags.split(',').map(t => t.trim()),
      allergens: [],
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'recipes'), newRecipe);
      setShowAddModal(false);
      fetchRecipes(); // Refresh list
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">本地食谱库</h2>
          <p className="text-gray-500 mt-2">管理您本地存储的所有食谱</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            添加食谱
          </button>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            返回
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="text-gray-500">本地数据库目前为空，AI 生成的食谱会自动保存在这里。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <div key={recipe.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
              <div className="h-32 bg-gray-100 relative">
                <img src={getDishImageUrl(recipe.title, recipe.cuisine)} alt={recipe.title} className="w-full h-full object-cover" />
                <button 
                  onClick={() => recipe.id && handleDelete(recipe.id)}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md shadow-sm transition-colors"
                  title="删除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
              <div className="p-4 flex-grow">
                <h3 className="font-bold text-gray-900 mb-1">{recipe.title}</h3>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{recipe.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {recipe.tags?.map(t => (
                    <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">{t}</span>
                  ))}
                </div>
                <div className="text-xs text-gray-600 flex justify-between mt-auto pt-3 border-t border-gray-100">
                  <span>{recipe.calories} kcal</span>
                  <span>P: {recipe.protein}g | C: {recipe.carbs}g | F: {recipe.fats}g</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">手动添加食谱</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">食谱名称</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="例如：香煎鸡胸肉" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input required value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="简单描述一下这道菜" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">热量 (kcal)</label>
                  <input type="number" required value={calories} onChange={e => setCalories(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">蛋白质 (g)</label>
                  <input type="number" required value={protein} onChange={e => setProtein(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">碳水 (g)</label>
                  <input type="number" required value={carbs} onChange={e => setCarbs(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">脂肪 (g)</label>
                  <input type="number" required value={fats} onChange={e => setFats(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签 (用逗号分隔)</label>
                <input required value={tags} onChange={e => setTags(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="减脂, 高蛋白, 中餐" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">食材 (用逗号分隔)</label>
                <input required value={ingredients} onChange={e => setIngredients(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="鸡胸肉, 西兰花, 盐" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">步骤 (换行分隔)</label>
                <textarea required value={instructions} onChange={e => setInstructions(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24" placeholder="1. 切块&#10;2. 煮熟" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600">保存食谱</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeLibrary;
