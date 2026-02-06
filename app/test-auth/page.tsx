// app/test-auth/page.tsx
'use client';

import { useState } from 'react';

export default function TestAuthPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testSecureCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/secure-check', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setResult(data);
      console.log('Secure-check result:', data);
      
      if (data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        alert('Auth successful! Token saved.');
      }
    } catch (error) {
      console.error('Test failed:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testSimpleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: '099cb23d-ffc0-11f0-b998-98e7f4364d07'
        })
      });
      const data = await response.json();
      setResult(data);
      console.log('Simple login result:', data);
    } catch (error) {
      console.error('Login test failed:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const clearStorage = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('currentUser');
    setResult(null);
    alert('Storage cleared!');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      
      <div className="space-y-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Test User Info</h2>
          <p><strong>ID:</strong> 099cb23d-ffc0-11f0-b998-98e7f4364d07</p>
          <p><strong>Username:</strong> smegnewdestew</p>
          <p><strong>Name:</strong> Simegnew</p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={testSecureCheck}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Test Secure Check
          </button>
          
          <button
            onClick={testSimpleLogin}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Test Simple Login
          </button>
          
          <button
            onClick={clearStorage}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Clear Storage
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p>Loading...</p>
        </div>
      )}
      
      {result && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Result:</h2>
          <pre className="bg-gray-50 p-4 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}