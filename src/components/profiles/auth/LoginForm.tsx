'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('woofadaar_token', data.token);
        window.location.href = '/profile';
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Login failed');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-primary mb-6 text-center">Welcome Back!</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-dark-grey mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary"
            placeholder="your.email@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-grey mb-2">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full px-4 py-3 border border-light-grey rounded-lg focus:ring-2 focus:ring-primary"
            placeholder="Enter your password"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors"
        >
          Login
        </button>

        <div className="text-center">
          <a href="/register" className="text-primary hover:underline">
            Don't have an account? Register here
          </a>
        </div>
      </form>
    </div>
  );
}