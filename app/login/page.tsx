// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PersonCircle, Lock, ArrowRight } from 'react-bootstrap-icons';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifier, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Login successful:', data.user.username);
        
        // Store user data
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('auth_token', data.token);
        
        // Redirect to game page
        router.push('/game/card-picker');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDemoLogin = async (userId: string) => {
    setLoading(true);
    setError('');
    
    try {
      // For demo purposes, we'll simulate a login by setting localStorage
      const testUsers = [
        {
          id: 'b73bb25f-0385-11f1-a7c6-98e7f4364d07',
          username: 'adinno',
          first_name: 'Adinno',
          balance: 50,
          telegram_id: 'userYWRpbm5vQG1770400825524',
          role: 'user',
          email: 'adinno@gmail.com'
        },
        {
          id: 'test-user-2',
          username: 'player2',
          first_name: 'Player Two',
          balance: 100,
          telegram_id: 'player2',
          role: 'user',
          email: 'player2@example.com'
        },
        {
          id: 'test-user-3',
          username: 'vip_player',
          first_name: 'VIP User',
          balance: 500,
          telegram_id: 'vip123',
          role: 'user',
          email: 'vip@example.com'
        }
      ];
      
      const selectedUser = testUsers.find(u => u.id === userId) || testUsers[0];
      
      localStorage.setItem('currentUser', JSON.stringify(selectedUser));
      localStorage.setItem('auth_token', 'demo-token-' + Date.now());
      
      console.log('✅ Demo login as:', selectedUser.username);
      router.push('/game/card-picker');
      
    } catch (error) {
      console.error('Demo login error:', error);
      setError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-4">
              <PersonCircle size={32} color="white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Habesha Bingo</h1>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PersonCircle className="text-gray-400" size={20} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter username or email"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
              Quick Demo Login (For Testing)
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleDemoLogin('b73bb25f-0385-11f1-a7c6-98e7f4364d07')}
                disabled={loading}
                className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50"
              >
                Login as Adinno ($50)
              </button>
              <button
                onClick={() => handleDemoLogin('test-user-2')}
                disabled={loading}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-colors disabled:opacity-50"
              >
                Login as Player 2 ($100)
              </button>
              <button
                onClick={() => handleDemoLogin('test-user-3')}
                disabled={loading}
                className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-colors disabled:opacity-50"
              >
                Login as VIP User ($500)
              </button>
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>© 2024 Habesha Bingo. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}