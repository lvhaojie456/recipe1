import React, { useState, useEffect } from 'react';
import { UserPreferences } from '../types';
import { Sparkles, ArrowRight, Activity, MapPin } from './Icons';

interface PreferenceFormProps {
  onSubmit: (prefs: UserPreferences) => void;
  isSubmitting: boolean;
}

const ALLERGY_OPTIONS = ['花生', '坚果', '海鲜', '大豆', '鸡蛋', '牛奶', '小麦', '麸质', '乳糖'];
const CHRONIC_DISEASE_OPTIONS = ['糖尿病', '高血压', '高血脂', '痛风', '肠胃敏感', '无'];
const FLAVOR_OPTIONS = ['喜辣', '喜甜', '偏咸', '清淡', '酸甜', '原汁原味'];
const DIET_TYPE_OPTIONS = ['无特殊', '全素', '蛋奶素', '生酮饮食', '低碳水', '地中海饮食', '间歇性禁食'];
const GOAL_OPTIONS = ['减脂', '增肌', '维持现状', '备孕', '术后恢复', '控制三高'];
const ACTIVITY_OPTIONS = ['久坐', '轻度活动', '中度活动', '重度活动', '极重度活动'];

const PreferenceForm: React.FC<PreferenceFormProps> = ({ onSubmit, isSubmitting }) => {
  // 1. 基础生理参数
  const [gender, setGender] = useState<'男' | '女' | '其他'>('男');
  const [age, setAge] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [activityLevel, setActivityLevel] = useState<UserPreferences['activityLevel']>('轻度活动');
  const [healthGoal, setHealthGoal] = useState<UserPreferences['healthGoal']>('维持现状');

  // 2. 健康状况与禁忌
  const [allergies, setAllergies] = useState<string[]>([]);
  const [chronicDiseases, setChronicDiseases] = useState<string[]>(['无']);
  const [medications, setMedications] = useState<string>('');

  // 3. 饮食习惯与偏好
  const [flavorPreferences, setFlavorPreferences] = useState<string[]>([]);
  const [dietType, setDietType] = useState<string>('无特殊');
  const [dislikedFoodsInput, setDislikedFoodsInput] = useState<string>('');

  // 4. 生活方式与场景
  const [cookingSkill, setCookingSkill] = useState<UserPreferences['cookingSkill']>('偶尔做饭');
  const [prepTimeLimit, setPrepTimeLimit] = useState<string>('30');
  const [diningContext, setDiningContext] = useState<UserPreferences['diningContext']>('自己做');
  const [budget, setBudget] = useState<UserPreferences['budget']>('适中');
  const [location, setLocation] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);

  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiStatus, setBmiStatus] = useState<string>('');

  useEffect(() => {
    if (height && weight) {
      const h = parseFloat(height) / 100;
      const w = parseFloat(weight);
      if (!isNaN(h) && !isNaN(w) && h > 0) {
        const val = w / (h * h);
        setBmi(parseFloat(val.toFixed(1)));
        if (val < 18.5) setBmiStatus('偏瘦');
        else if (val < 24) setBmiStatus('正常');
        else if (val < 28) setBmiStatus('超重');
        else setBmiStatus('肥胖');
      } else {
        setBmi(null);
        setBmiStatus('');
      }
    }
  }, [height, weight]);

  const toggleSelection = (list: string[], setList: (l: string[]) => void, item: string, exclusiveItem?: string) => {
    if (exclusiveItem && item === exclusiveItem) {
      setList([exclusiveItem]);
      return;
    }
    
    let newList = list.filter(i => i !== exclusiveItem);
    if (newList.includes(item)) {
      newList = newList.filter(i => i !== item);
      if (newList.length === 0 && exclusiveItem) newList = [exclusiveItem];
    } else {
      newList = [...newList, item];
    }
    setList(newList);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('您的浏览器不支持地理定位');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding or just coordinates
          // For simplicity in this demo, we'll just use a placeholder or a simple string
          // In a real app, you'd call a geocoding API
          const { latitude, longitude } = position.coords;
          setLocation(`经度: ${latitude.toFixed(2)}, 纬度: ${longitude.toFixed(2)}`);
          // Optionally, we could try to get a city name if we had an API key for Google Maps etc.
        } catch (err) {
          console.error(err);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.error(err);
        setIsLocating(false);
        alert('无法获取位置，请手动输入');
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      gender,
      age: parseInt(age) || 30,
      height: parseFloat(height) || 170,
      weight: parseFloat(weight) || 65,
      activityLevel,
      healthGoal,
      allergies,
      chronicDiseases,
      medications,
      flavorPreferences,
      dietType,
      dislikedFoods: dislikedFoodsInput.split(/[,，、]/).map(s => s.trim()).filter(Boolean),
      cookingSkill,
      prepTimeLimit: parseInt(prepTimeLimit) || 30,
      diningContext,
      budget,
      location
    });
  };

  const SectionTitle = ({ title, subtitle, step }: { title: string, subtitle: string, step: number }) => (
    <div className="mb-6 border-b border-gray-100 pb-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">
          {step}
        </div>
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
      </div>
      <p className="text-sm text-gray-500 ml-11">{subtitle}</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-10 bg-white p-6 md:p-10 rounded-3xl shadow-xl border border-orange-100">
      <div className="text-center space-y-3 mb-8">
        <h2 className="text-3xl font-bold text-gray-900">定制您的专属食谱</h2>
        <p className="text-gray-500 max-w-lg mx-auto">我们需要了解您的四个核心维度，以确保推荐的食谱既科学健康，又符合您的生活习惯。</p>
      </div>

      {/* 1. 基础生理参数 */}
      <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
        <SectionTitle step={1} title="基础生理参数" subtitle="决定能量需求与宏量营养素配比的基石" />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase">性别</label>
                <select value={gender} onChange={(e) => setGender(e.target.value as any)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="其他">其他</option>
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase">年龄</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="岁" className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" required min="1" max="120" />
            </div>
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase">身高 (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" required min="50" max="250" />
            </div>
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase">体重 (kg)</label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" required min="20" max="300" />
            </div>
        </div>

        {bmi && (
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-brand-200 mb-6 shadow-sm">
                <span className="text-sm text-gray-600 font-medium">当前 BMI 指数: <span className="text-brand-600 text-xl font-bold ml-2">{bmi}</span></span>
                <span className={`text-sm font-bold px-4 py-1.5 rounded-full ${
                    bmiStatus === '正常' ? 'bg-green-100 text-green-700' : 
                    bmiStatus === '偏瘦' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                }`}>
                    {bmiStatus}
                </span>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">日常活动量</label>
              <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as any)} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
                  {ACTIVITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          </div>
          <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">健康目标</label>
              <select value={healthGoal} onChange={(e) => setHealthGoal(e.target.value as any)} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
                  {GOAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          </div>
        </div>
      </div>

      {/* 2. 健康状况与禁忌 */}
      <div className="bg-red-50/30 p-6 rounded-2xl border border-red-100">
        <SectionTitle step={2} title="健康状况与禁忌" subtitle="决定食谱的安全边界，防止健康风险" />
        
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">食物过敏史</label>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => toggleSelection(allergies, setAllergies, opt)}
                  className={`px-4 py-2 rounded-xl text-sm transition-all border ${
                    allergies.includes(opt) ? 'bg-red-100 border-red-300 text-red-800 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-red-200'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">慢性病/健康状况</label>
            <div className="flex flex-wrap gap-2">
              {CHRONIC_DISEASE_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => toggleSelection(chronicDiseases, setChronicDiseases, opt, '无')}
                  className={`px-4 py-2 rounded-xl text-sm transition-all border ${
                    chronicDiseases.includes(opt) ? 'bg-orange-100 border-orange-300 text-orange-800 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-200'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">服药情况 (如有)</label>
            <input type="text" value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="例如：正在服用抗凝药（需限制绿叶菜）" className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
        </div>
      </div>

      {/* 3. 饮食习惯与偏好 */}
      <div className="bg-green-50/30 p-6 rounded-2xl border border-green-100">
        <SectionTitle step={3} title="饮食习惯与偏好" subtitle="决定食谱的执行力，让您吃得开心" />
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">饮食流派</label>
              <select value={dietType} onChange={(e) => setDietType(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
                  {DIET_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">口味偏好</label>
              <div className="flex flex-wrap gap-2">
                {FLAVOR_OPTIONS.map(opt => (
                  <button key={opt} type="button" onClick={() => toggleSelection(flavorPreferences, setFlavorPreferences, opt)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${
                      flavorPreferences.includes(opt) ? 'bg-green-100 border-green-300 text-green-800 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:border-green-200'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">厌恶食物</label>
            <input type="text" value={dislikedFoodsInput} onChange={(e) => setDislikedFoodsInput(e.target.value)} placeholder="例如：香菜，内脏，苦瓜（用逗号分隔）" className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
        </div>
      </div>

      {/* 4. 生活方式与场景 */}
      <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100">
        <SectionTitle step={4} title="生活方式与场景" subtitle="决定食谱的可落地性，适应您的节奏" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">烹饪能力</label>
              <select value={cookingSkill} onChange={(e) => setCookingSkill(e.target.value as any)} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
                  <option value="厨房小白">厨房小白 (只会微波炉/空气炸锅)</option>
                  <option value="偶尔做饭">偶尔做饭 (能做家常菜)</option>
                  <option value="烹饪达人">烹饪达人 (喜欢挑战复杂菜式)</option>
              </select>
          </div>
          <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">备餐时间限制 (分钟)</label>
              <input type="number" value={prepTimeLimit} onChange={(e) => setPrepTimeLimit(e.target.value)} placeholder="30" className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" min="5" max="300" />
          </div>
          <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">主要用餐场景</label>
              <select value={diningContext} onChange={(e) => setDiningContext(e.target.value as any)} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
                  <option value="自己做">在家自己做</option>
                  <option value="点外卖">主要点外卖/外出就餐</option>
                  <option value="经常应酬">经常需要应酬</option>
              </select>
          </div>
          <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">食材预算</label>
              <select value={budget} onChange={(e) => setBudget(e.target.value as any)} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none">
                  <option value="平价">平价 (追求性价比)</option>
                  <option value="适中">适中 (日常标准)</option>
                  <option value="高端">高端 (有机/进口食材)</option>
              </select>
          </div>
          <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700">当前位置 (用于推荐当地应季食材)</label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    placeholder="例如：北京，或者点击右侧自动获取" 
                    className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none" 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="px-4 py-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-200 hover:bg-brand-100 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  <Activity className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
                  {isLocating ? '定位中...' : '自动定位'}
                </button>
              </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8"
      >
        {isSubmitting ? (
          <>
            <Sparkles className="animate-spin" />
            正在匹配数据库与智能生成...
          </>
        ) : (
          <>
            生成我的专属食谱
            <ArrowRight />
          </>
        )}
      </button>
    </form>
  );
};

export default PreferenceForm;