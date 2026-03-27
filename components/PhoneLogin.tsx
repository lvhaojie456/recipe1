import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseUtils';
import { ChefHat } from './Icons';

const PhoneLogin: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+86${phoneNumber}`;
      // Use a dummy email to simulate phone login, but use the real password
      const dummyEmail = `${formattedPhone.replace('+', '')}@mock-phone.chefgenie.app`;

      try {
        // Try to sign in first
        await signInWithEmailAndPassword(auth, dummyEmail, password);
      } catch (signInErr: any) {
        // If sign in fails (likely user not found), try to register
        try {
          const result = await createUserWithEmailAndPassword(auth, dummyEmail, password);
          const user = result.user;
          
          // Create user profile in Firestore
          const userRef = doc(db, 'users', user.uid);
          try {
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                phoneNumber: formattedPhone,
                createdAt: serverTimestamp()
              });
            }
          } catch (firestoreErr) {
            handleFirestoreError(firestoreErr, OperationType.WRITE, `users/${user.uid}`);
          }
        } catch (createErr: any) {
          console.error('Error creating mock user:', createErr);
          if (createErr.code === 'auth/email-already-in-use') {
             setError('该手机号已注册，但登录失败。请检查 Firebase 控制台是否开启了“邮箱/密码”登录。');
          } else if (createErr.code === 'auth/operation-not-allowed') {
             setError('请前往 Firebase 控制台 (Authentication -> Sign-in method) 开启 "Email/Password" 登录方式。');
          } else {
             setError(createErr.message || '登录/注册失败，请稍后重试。');
          }
        }
      }
    } catch (err: any) {
      console.error('Error during login process:', err);
      setError(err.message || '发生未知错误。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-brand-500 p-8 text-center">
          <div className="bg-white/20 p-3 rounded-full inline-block mb-4">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">登录您的专属厨房</h2>
          <p className="text-brand-100 mt-2">使用手机号和密码登录或注册</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手机号码
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  +86
                </span>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 min-w-0 block w-full px-4 py-3 rounded-none rounded-r-lg border border-gray-300 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  placeholder="请输入手机号"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder="请输入密码（至少6位）"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !phoneNumber || !password}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '处理中...' : '登录 / 注册'}
            </button>
          </form>
          
          <div className="mt-6 text-xs text-gray-400 text-center">
            <p>首次输入手机号和密码将自动为您注册账号。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneLogin;
