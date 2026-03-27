import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Sparkles } from './Icons';
import { ChatMessage, UserPreferences, Recipe } from '../types';
import { chatWithChef } from '../services/geminiService';
import Markdown from 'react-markdown';

interface ChatWidgetProps {
  prefs?: UserPreferences;
  selectedRecipe: Recipe | null;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ prefs, selectedRecipe }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: '你好！我是您的私人大厨。有什么我可以帮您的吗？您可以问我关于食谱的细节、营养建议，或者如何根据您的健康状况调整饮食。', timestamp: Date.now() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithChef(input, { prefs, recipe: selectedRecipe || undefined });
      const modelMsg: ChatMessage = { role: 'model', text: response, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = { role: 'model', text: '抱歉，我遇到了一些问题。请稍后再试。', timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 ${
          isOpen ? 'bg-gray-800 text-white rotate-90' : 'bg-brand-500 text-white'
        }`}
      >
        {isOpen ? <X /> : <MessageCircle className="w-7 h-7" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[90vw] max-w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-4 bg-brand-500 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">私人大厨</h3>
              <p className="text-[10px] opacity-80">在线为您提供营养建议</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-500 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                }`}>
                  <div className="markdown-body">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="问问大厨..."
              className="flex-grow p-3 bg-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 bg-brand-500 text-white rounded-xl flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              <Send />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
