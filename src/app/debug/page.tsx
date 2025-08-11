'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DebugPage() {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [apiTest, setApiTest] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Check localStorage for tokens
    const token = localStorage.getItem('woofadaar_token');
    const userType = localStorage.getItem('user_type');
    const userInfo = localStorage.getItem('user_info');
    
    setTokenInfo({
      token: token ? `Token exists: ${token.substring(0, 10)}...` : 'No token',
      userType,
      userInfo: userInfo ? JSON.parse(userInfo) : null
    });

    // Test API calls if token exists
    if (token) {
      testApiCalls(token);
    }
  }, []);

  const testApiCalls = async (token: string) => {
    const results: any = {};

    // Test partner dashboard API
    try {
      const dashboardResponse = await fetch('/api/partners/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      results.dashboardAPI = {
        status: dashboardResponse.status,
        ok: dashboardResponse.ok,
        data: dashboardResponse.ok ? await dashboardResponse.json() : await dashboardResponse.text()
      };
    } catch (error) {
      results.dashboardAPI = { error: error.message };
    }

    // Test user API
    try {
      const userResponse = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      results.userAPI = {
        status: userResponse.status,
        ok: userResponse.ok,
        data: userResponse.ok ? await userResponse.json() : await userResponse.text()
      };
    } catch (error) {
      results.userAPI = { error: error.message };
    }

    setApiTest(results);
  };

  const clearStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  const testRedirect = () => {
    const userType = localStorage.getItem('user_type');
    if (userType === 'partner') {
      router.push('/partner/dashboard');
    } else {
      router.push('/profile');
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug Info</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">LocalStorage Contents:</h2>
        <pre className="text-sm">
          {JSON.stringify(tokenInfo, null, 2)}
        </pre>
      </div>

      {apiTest && (
        <div className="bg-blue-100 p-4 rounded mb-4">
          <h2 className="font-semibold mb-2">API Test Results:</h2>
          <pre className="text-sm">
            {JSON.stringify(apiTest, null, 2)}
          </pre>
        </div>
      )}

      <div className="space-x-4">
        <button 
          onClick={testRedirect}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Redirect
        </button>
        
        <button 
          onClick={clearStorage}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Clear LocalStorage & Reload
        </button>
      </div>
    </div>
  );
}