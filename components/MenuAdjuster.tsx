import React, { useState } from 'react';
import { Sliders, Sparkles, ArrowRight } from './Icons';

interface MenuAdjusterProps {
  onAdjust: (instruction: string) => void;
  isAdjusting: boolean;
}

const MenuAdjuster: React.FC<MenuAdjusterProps> = ({ onAdjust, isAdjusting }) => {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isAdjusting) return;
    onAdjust(instruction);
    setInstruction('');
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-3xl shadow-lg border border-orange-100 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">硅基流动 菜单微调</h3>
          <p className="text-xs text-gray-500">对生成的食谱不满意？告诉 硅基流动 您的具体要求。</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
        <input 
          type="text" 
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="例如：我想让这些菜更辣一点，或者把肉类换成海鲜..."
          className="flex-grow p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
        />
        <button 
          type="submit"
          disabled={!instruction.trim() || isAdjusting}
          className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isAdjusting ? (
            <Sparkles className="animate-spin" />
          ) : (
            <>
              立即调整
              <ArrowRight />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default MenuAdjuster;
