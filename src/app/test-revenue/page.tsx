'use client';
import { useState, useEffect } from 'react';

export default function TestRevenuePage() {
  const [token, setToken] = useState<string>('');
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string>('');

  useEffect(() => {
    // Get token from localStorage using the correct key used by the existing app
    const storedToken = localStorage.getItem('woofadaar_token') || '';
    setToken(storedToken);
  }, []);

  const testEndpoint = async (name: string, url: string, method: string = 'GET', body?: any) => {
    setLoading(name);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();
      
      setResults(prev => ({
        ...prev,
        [name]: {
          status: response.status,
          data: data,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [name]: {
          status: 'Error',
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date().toISOString()
        }
      }));
    }
    setLoading('');
  };

  if (!token) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Week 14 Revenue Testing</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p><strong>Please login first!</strong></p>
          <p>Go to <a href="/login" className="underline text-blue-600">/login</a> to authenticate, then return here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">🚀 Week 14 Revenue Integration Testing</h1>
      
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
        <p><strong>JWT Token Found:</strong> {token.substring(0, 20)}...</p>
        <p>You can now test the revenue endpoints below!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Premium Services Tests */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">⭐ Premium Services</h2>
          <div className="space-y-3">
            <button 
              onClick={() => testEndpoint('premium_services', '/api/premium/services')}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-300"
              disabled={loading === 'premium_services'}
            >
              {loading === 'premium_services' ? 'Loading...' : 'Get Premium Services'}
            </button>
            
            <button 
              onClick={() => testEndpoint('premium_access', '/api/premium/access?include_usage=true')}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-300"
              disabled={loading === 'premium_access'}
            >
              {loading === 'premium_access' ? 'Loading...' : 'Check Premium Access'}
            </button>

            <button 
              onClick={() => testEndpoint('premium_analytics', '/api/premium/analytics')}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-300"
              disabled={loading === 'premium_analytics'}
            >
              {loading === 'premium_analytics' ? 'Loading...' : 'Get Premium Analytics'}
            </button>
          </div>
        </div>

        {/* Payment Tests */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">💳 Payment System</h2>
          <div className="space-y-3">
            <button 
              onClick={() => testEndpoint('payment_manage', '/api/payments/manage?include_analytics=true')}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
              disabled={loading === 'payment_manage'}
            >
              {loading === 'payment_manage' ? 'Loading...' : 'Get Payment History'}
            </button>
            
            <button 
              onClick={() => testEndpoint('create_payment', '/api/payments/manage', 'POST', {
                amount: 299,
                payment_type: 'dog_id',
                service_id: 'dog_id_premium'
              })}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
              disabled={loading === 'create_payment'}
            >
              {loading === 'create_payment' ? 'Loading...' : 'Create Test Payment (₹299)'}
            </button>
          </div>
        </div>

        {/* Partner & Commission Tests */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🤝 Partner & Commissions</h2>
          <div className="space-y-3">
            <button 
              onClick={() => testEndpoint('partner_subscriptions', '/api/partners/subscriptions')}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
              disabled={loading === 'partner_subscriptions'}
            >
              {loading === 'partner_subscriptions' ? 'Loading...' : 'Get Partner Subscriptions'}
            </button>
            
            <button 
              onClick={() => testEndpoint('commissions', '/api/commissions?include_analytics=true')}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
              disabled={loading === 'commissions'}
            >
              {loading === 'commissions' ? 'Loading...' : 'Get Commission Data'}
            </button>

            <button 
              onClick={() => testEndpoint('commission_payouts', '/api/commissions/payouts')}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
              disabled={loading === 'commission_payouts'}
            >
              {loading === 'commission_payouts' ? 'Loading...' : 'Get Payout Summary'}
            </button>
          </div>
        </div>

        {/* Revenue Analytics Tests */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📈 Revenue Analytics</h2>
          <div className="space-y-3">
            <button 
              onClick={() => testEndpoint('revenue_dashboard', '/api/analytics/revenue-dashboard?period=month')}
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-300"
              disabled={loading === 'revenue_dashboard'}
            >
              {loading === 'revenue_dashboard' ? 'Loading...' : 'Revenue Dashboard'}
            </button>
            
            <button 
              onClick={() => testEndpoint('realtime_metrics', '/api/analytics/realtime')}
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-300"
              disabled={loading === 'realtime_metrics'}
            >
              {loading === 'realtime_metrics' ? 'Loading...' : 'Real-time Metrics'}
            </button>

            <button 
              onClick={() => testEndpoint('revenue_trends', '/api/revenue/analytics/trends?include_forecasting=true')}
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-300"
              disabled={loading === 'revenue_trends'}
            >
              {loading === 'revenue_trends' ? 'Loading...' : 'Revenue Trends & Forecasting'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Display */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">📊 Test Results</h2>
        {Object.keys(results).length === 0 ? (
          <p className="text-gray-500">Click any button above to test the endpoints. Results will appear here.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(results).map(([name, result]: [string, any]) => (
              <div key={name} className="bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{name.replace(/_/g, ' ').toUpperCase()}</h3>
                  <span className={`px-2 py-1 rounded text-sm ${
                    result.status === 200 ? 'bg-green-100 text-green-800' : 
                    result.status < 400 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    Status: {result.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{result.timestamp}</p>
                <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}