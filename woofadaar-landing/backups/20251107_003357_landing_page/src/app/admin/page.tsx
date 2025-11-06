'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Download, Users, Calendar, MapPin, Dog } from 'lucide-react';

interface WaitlistEntry {
  id: string;
  email: string;
  name: string;
  phone: string;
  location: string;
  dog_owner: boolean;
  position: number | null;
  status: string;
  created_at: string;
  dogName?: string;
  dogBreed?: string;
  dogAge?: string;
  excitement?: string;
  weeklyTips?: boolean;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'dog_owners' | 'non_dog_owners'>('all');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/waitlist', {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setIsAuthenticated(true);
      setEntries(data.entries);
    } catch (err: any) {
      setError(err.message || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/waitlist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ format: 'csv' })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export data');
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (filter === 'all') return true;
    if (filter === 'dog_owners') return entry.dog_owner;
    if (filter === 'non_dog_owners') return !entry.dog_owner;
    return true;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-mint/10 to-primary-purple/10 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-ui-textPrimary mb-2">
              Woofadaar Admin
            </h1>
            <p className="text-ui-textSecondary">
              Enter password to view waitlist
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-ui-border focus:border-primary-mint focus:outline-none transition-colors"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ui-textSecondary hover:text-ui-textPrimary"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || !password}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-mint/10 to-primary-purple/10 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-ui-textPrimary mb-2">
                Waitlist Dashboard
              </h1>
              <div className="flex items-center gap-4 text-sm text-ui-textSecondary">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{entries.length} total signups</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dog className="w-4 h-4" />
                  <span>{entries.filter(e => e.dog_owner).length} dog owners</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-mint text-white'
                  : 'bg-ui-bgLight text-ui-textSecondary hover:bg-ui-border'
              }`}
            >
              All ({entries.length})
            </button>
            <button
              onClick={() => setFilter('dog_owners')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'dog_owners'
                  ? 'bg-primary-mint text-white'
                  : 'bg-ui-bgLight text-ui-textSecondary hover:bg-ui-border'
              }`}
            >
              Dog Owners ({entries.filter(e => e.dog_owner).length})
            </button>
            <button
              onClick={() => setFilter('non_dog_owners')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'non_dog_owners'
                  ? 'bg-primary-mint text-white'
                  : 'bg-ui-bgLight text-ui-textSecondary hover:bg-ui-border'
              }`}
            >
              Non-Owners ({entries.filter(e => !e.dog_owner).length})
            </button>
          </div>
        </div>

        {/* Entries Grid */}
        <div className="grid gap-4">
          {filteredEntries.map((entry, index) => (
            <div
              key={entry.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-ui-textPrimary">
                        {entry.name}
                      </h3>
                      <p className="text-sm text-ui-textSecondary">{entry.email}</p>
                    </div>
                    {entry.position && (
                      <span className="bg-primary-mint/10 text-primary-mint px-3 py-1 rounded-full text-sm font-semibold">
                        #{entry.position}
                      </span>
                    )}
                  </div>

                  {entry.phone && (
                    <div className="flex items-center gap-2 text-sm text-ui-textSecondary">
                      <span className="font-medium">Phone:</span>
                      <span>{entry.phone}</span>
                    </div>
                  )}

                  {entry.location && (
                    <div className="flex items-center gap-2 text-sm text-ui-textSecondary">
                      <MapPin className="w-4 h-4" />
                      <span>{entry.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-ui-textSecondary">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(entry.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>

                {/* Right Column - Dog Info */}
                {entry.dog_owner && (
                  <div className="bg-primary-mint/5 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-primary-mint font-semibold mb-2">
                      <Dog className="w-5 h-5" />
                      <span>Dog Information</span>
                    </div>

                    {entry.dogName && (
                      <div className="text-sm">
                        <span className="font-medium text-ui-textPrimary">Name:</span>{' '}
                        <span className="text-ui-textSecondary">{entry.dogName}</span>
                      </div>
                    )}

                    {entry.dogBreed && (
                      <div className="text-sm">
                        <span className="font-medium text-ui-textPrimary">Breed:</span>{' '}
                        <span className="text-ui-textSecondary">{entry.dogBreed}</span>
                      </div>
                    )}

                    {entry.dogAge && (
                      <div className="text-sm">
                        <span className="font-medium text-ui-textPrimary">Age:</span>{' '}
                        <span className="text-ui-textSecondary">{entry.dogAge}</span>
                      </div>
                    )}

                    {entry.excitement && (
                      <div className="text-sm">
                        <span className="font-medium text-ui-textPrimary">Excited about:</span>{' '}
                        <span className="text-ui-textSecondary">{entry.excitement}</span>
                      </div>
                    )}

                    {entry.weeklyTips && (
                      <div className="text-sm text-primary-mint font-medium mt-2">
                        ✓ Opted in for weekly tips
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-ui-border mx-auto mb-4" />
            <h3 className="text-xl font-bold text-ui-textPrimary mb-2">
              No Entries Yet
            </h3>
            <p className="text-ui-textSecondary">
              Waitlist entries will appear here once people start signing up.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
