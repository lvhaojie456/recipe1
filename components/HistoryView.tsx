import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { HistoryRecord } from '../types';
import { Activity, Calendar, ChevronLeft, TrendingUp } from './Icons';
import { generateTrendAdvice } from '../services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HistoryViewProps {
    onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onBack }) => {
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [trendAdvice, setTrendAdvice] = useState<string | null>(null);
    const [loadingAdvice, setLoadingAdvice] = useState(false);
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(
                    collection(db, 'users', auth.currentUser.uid, 'history'),
                    orderBy('createdAt', 'asc')
                );
                const snap = await getDocs(q);
                const records = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as HistoryRecord[];
                setHistory(records);

                if (records.length > 0) {
                    setSelectedRecordId(records[records.length - 1].id);
                    setLoadingAdvice(true);
                    // Generate trend advice based on the history (pass the records)
                    const advice = await generateTrendAdvice(records);
                    setTrendAdvice(advice);
                    setLoadingAdvice(false);
                }
            } catch (err) {
                console.error("Error fetching history", err);
                setLoadingAdvice(false);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    // Prepare chart data (already in chronological order)
    const chartData = history.map((record, index) => {
        const dateStr = record.createdAt?.toDate 
            ? record.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
            : `记录${index + 1}`;
        return {
            name: dateStr,
            weight: record.preferences.weight,
            bmi: record.preferences.bmi ? parseFloat(record.preferences.bmi.toString()) : null,
            recordId: record.id
        };
    });

    const handleChartClick = (data: any) => {
        if (data?.activePayload?.[0]?.payload?.recordId) {
            setSelectedRecordId(data.activePayload[0].payload.recordId);
        } else if (data?.activeTooltipIndex !== undefined && chartData[data.activeTooltipIndex]) {
            setSelectedRecordId(chartData[data.activeTooltipIndex].recordId);
        }
    };

    const handleDotClick = (props: any) => {
        if (props?.payload?.recordId) {
            setSelectedRecordId(props.payload.recordId);
        }
    };

    const selectedRecord = history.find(r => r.id === selectedRecordId);

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <style>{`
                .recharts-wrapper, 
                .recharts-wrapper *, 
                .recharts-surface, 
                .recharts-surface:focus,
                .recharts-surface:active,
                .recharts-responsive-container {
                    outline: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                }
                svg:focus, svg:active {
                    outline: none !important;
                }
            `}</style>
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onBack}
                    className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800">我的健康档案</h2>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">加载历史记录中...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">暂无历史记录，快去生成您的第一份专属食谱吧！</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Trend Analysis Section */}
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-brand-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 to-orange-400"></div>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 mt-2">
                            <TrendingUp className="w-6 h-6 text-brand-500" />
                            阶段性健康总结与建议
                        </h3>
                        
                        {/* Chart */}
                        {chartData.length > 1 ? (
                            <div className="h-64 w-full mb-8" style={{ WebkitTapHighlightColor: 'transparent' }}>
                                <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                                    <LineChart 
                                        data={chartData} 
                                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }} 
                                        onClick={handleChartClick}
                                        style={{ outline: 'none', userSelect: 'none', cursor: 'pointer' }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} domain={['auto', 'auto']} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '4px' }}
                                            cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '3 3' }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Line 
                                            yAxisId="left" 
                                            type="monotone" 
                                            dataKey="weight" 
                                            name="体重 (kg)" 
                                            stroke="#f97316" 
                                            strokeWidth={3} 
                                            dot={{ r: 6, strokeWidth: 2, cursor: 'pointer', onClick: handleDotClick }} 
                                            activeDot={{ r: 8, strokeWidth: 0, cursor: 'pointer', onClick: handleDotClick }} 
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                                <p className="text-center text-xs text-gray-400 mt-2">点击图表上的数据点查看单次记录详情</p>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-2xl mb-8">
                                记录更多数据后，这里将展示您的体重变化趋势图。
                            </div>
                        )}

                        {/* Selected Record Details */}
                        {selectedRecord && (
                            <div className="mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-gray-200 pb-4">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="w-5 h-5 text-brand-500" />
                                        <span className="font-bold">{selectedRecord.createdAt?.toDate ? selectedRecord.createdAt.toDate().toLocaleString() : '刚刚'}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                                        <span className="bg-white text-gray-700 px-2.5 py-1 rounded-full border border-gray-200">目标: {selectedRecord.preferences.healthGoal}</span>
                                        <span className="bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full border border-brand-100">体重: {selectedRecord.preferences.weight}kg</span>
                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">BMI: {selectedRecord.preferences.bmi || '-'}</span>
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-brand-500" />
                                        单次健康建议
                                    </h4>
                                    <p className="text-gray-600 text-sm leading-relaxed bg-white p-4 rounded-xl border border-gray-100">
                                        {selectedRecord.healthAdvice}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 mb-2">生成食谱</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedRecord.recipes.map((r, i) => (
                                            <span key={i} className="text-xs bg-white text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                                                {r.title}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Trend Advice */}
                        <div className="bg-gradient-to-r from-orange-50 to-brand-50 border border-brand-100 p-6 rounded-2xl">
                            <h4 className="text-sm font-bold text-brand-700 mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                AI 综合建议
                            </h4>
                            {loadingAdvice ? (
                                <div className="flex items-center gap-3 text-gray-500 text-sm">
                                    <div className="w-4 h-4 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
                                    AI 正在分析您的历史数据...
                                </div>
                            ) : (
                                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                    {trendAdvice}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryView;
