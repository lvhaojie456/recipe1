import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, AlertCircle, Heart, Loader2, ChevronLeft } from 'lucide-react';
import { Recipe } from '../types';
import { analyzeHealthTrends } from '../services/geminiService';
import Markdown from 'react-markdown';

interface HealthAnalysisProps {
  history: Recipe[];
  onBack: () => void;
}

const HealthAnalysis: React.FC<HealthAnalysisProps> = ({ history, onBack }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (history.length === 0) {
        setAnalysis("暂无历史记录可供分析。请先生成并保存一些食谱。");
        setLoading(false);
        return;
      }

      try {
        const result = await analyzeHealthTrends(history);
        setAnalysis(result);
      } catch (error) {
        console.error("Analysis failed:", error);
        setAnalysis("分析失败，请稍后再试。");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [history]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={onBack}
        className="flex items-center text-stone-500 hover:text-stone-800 transition-colors mb-8 group"
      >
        <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
        返回历史记录
      </button>

      <div className="mb-12">
        <h1 className="text-4xl font-serif italic text-stone-900 mb-4">健康趋势分析</h1>
        <p className="text-stone-500">基于您的历史饮食偏好和身体参数演变，为您提供深度健康洞察。</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-stone-100 shadow-sm">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-stone-600 font-medium">主厨正在深度分析您的健康档案...</p>
          <p className="text-stone-400 text-sm mt-2">这可能需要一点时间，请稍候</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden"
        >
          <div className="p-8 md:p-12">
            <div className="prose prose-stone max-w-none">
              <div className="markdown-body">
                <Markdown>{analysis || ''}</Markdown>
              </div>
            </div>
          </div>

          <div className="bg-stone-50 p-8 border-t border-stone-100 flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-400 uppercase tracking-wider font-bold">分析样本</div>
                <div className="text-stone-900 font-medium">{history.length} 份历史记录</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-400 uppercase tracking-wider font-bold">趋势观察</div>
                <div className="text-stone-900 font-medium">持续追踪中</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-400 uppercase tracking-wider font-bold">风险预警</div>
                <div className="text-stone-900 font-medium">实时监控</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mt-12 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4">
        <Heart className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
        <div>
          <h4 className="text-emerald-900 font-bold mb-1">主厨寄语</h4>
          <p className="text-emerald-800 text-sm leading-relaxed">
            这份报告是基于您输入的数据生成的 AI 洞察。虽然我们结合了营养学和中医智慧，但它不能替代专业的医疗诊断。如果您有严重的健康问题，请务必咨询医生。
          </p>
        </div>
      </div>
    </div>
  );
};

export default HealthAnalysis;
