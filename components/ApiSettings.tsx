import React, { useState, useEffect } from 'react';
import { X } from './Icons';
import { useAuth } from '../services/authService';
import { setApiKey as setGlobalApiKey } from '../services/geminiService';

interface ApiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchApiKey = async () => {
      if (!user || !isOpen) return;
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
        console.error("Failed to fetch API key", error);
      }
    };
    fetchApiKey();
  }, [isOpen, user]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      alert('请输入有效的 API Key');
      return;
    }
    if (!user) {
        alert('请先登录');
        return;
    }
    
    setIsLoading(true);
    try {
        const response = await fetch('/api/settings/apikey', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uid: user.uid, apiKey: apiKey.trim() }),
        });
        
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.indexOf("application/json") !== -1) {
            setGlobalApiKey(apiKey.trim());
            onClose();
        } else {
            alert('保存失败，请重试');
        }
    } catch (error) {
        console.error("Failed to save API key", error);
        alert('保存失败，请重试');
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">设置 API Key</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          请输入您的 API Key 以继续使用。您的 Key 将安全地保存在后台数据库中。
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
        />
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-200 disabled:opacity-50"
        >
          {isLoading ? '保存中...' : '保存并继续'}
        </button>
      </div>
    </div>
  );
};

export default ApiSettings;
