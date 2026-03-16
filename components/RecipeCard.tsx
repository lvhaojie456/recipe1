import React from 'react';
import { Recipe } from '../types';
import { Clock, Flame, Sparkles } from './Icons';

const getDishImageUrl = (title: string, cuisine: string): string => {
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

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  index: number;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, index }) => {
  const imageUrl = getDishImageUrl(recipe.title, recipe.cuisine);

  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex flex-col h-full transform hover:-translate-y-1"
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img 
          src={imageUrl} 
          alt={recipe.title} 
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-brand-600 uppercase tracking-wide shadow-sm z-10">
            {recipe.cuisine}
        </div>
        {recipe.difficulty && (
             <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-white shadow-sm z-10">
                {recipe.difficulty}
             </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-brand-600 transition-colors">
          {recipe.title}
        </h3>
        
        <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-grow">
          {recipe.description}
        </p>

        {recipe.matchReason && (
            <div className="mb-4 bg-orange-50 p-2.5 rounded-lg border border-orange-100 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                <p className="text-xs text-brand-900 font-medium leading-relaxed">
                   <span className="font-bold text-brand-600">推荐理由：</span>
                   {recipe.matchReason}
                </p>
            </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <Clock className="text-brand-500" />
            <span>{recipe.prepTime + recipe.cookTime}分钟</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="text-brand-500" />
            <span>{recipe.calories} 千卡</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;