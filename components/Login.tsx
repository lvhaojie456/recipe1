import React, { useState } from 'react';
import { useAuth } from '../services/authService';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isRegister ? '创建账号' : '欢迎回来'}
          </h2>
          <p className="text-gray-500 mt-2">
            {isRegister ? '注册以开始您的健康饮食之旅' : '登录以查看您的个性化食谱'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">用户名</label>
            <input 
              type="text"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="请输入用户名" 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" 
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">密码</label>
            <input 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="请输入密码" 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all" 
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-brand-200 mt-2"
          >
            {isSubmitting ? '处理中...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>

        <div className="text-center pt-2">
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            {isRegister ? '已有账号？立即登录' : '没有账号？立即注册'}
          </button>
        </div>

        <div className="pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            本地存储模式：您的数据将安全地保存在此设备上。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
