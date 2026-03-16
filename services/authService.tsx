import React, { useState, useEffect, createContext, useContext } from 'react';

export interface LocalUser {
  uid: string;
  username: string;
}

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LocalUser>;
  register: (username: string, password: string) => Promise<LocalUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('chefgenie_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('chefgenie_user');
      }
    }
    setLoading(false);
  }, []);

  const register = async (username: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    const contentType = response.headers.get("content-type");
    if (!contentType || contentType.indexOf("application/json") === -1) {
        throw new Error('服务器响应格式错误，请稍后再试');
    }
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '注册失败');
    
    const userData = { uid: data.uid, username: data.username };
    localStorage.setItem('chefgenie_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    const contentType = response.headers.get("content-type");
    if (!contentType || contentType.indexOf("application/json") === -1) {
        throw new Error('服务器响应格式错误，请稍后再试');
    }
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '登录失败');
    
    const userData = { uid: data.uid, username: data.username };
    localStorage.setItem('chefgenie_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('chefgenie_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
