'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, Database, History, Calendar, CheckCircle } from 'lucide-react';

interface ProfileExportProps {
  onClose?: () => void;
}

interface ExportHistory {
  id: string;
  created_at: string;
  data_size: number;
}

export default function ProfileExport({ onClose }: ProfileExportProps) {
  const [exportType, setExportType] = useState<'basic' | 'full'>('basic');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [loading, setLoading] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchExportHistory();
  }, []);

  const fetchExportHistory = async () => {
    try {
      const response = await fetch('/api/profile/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExportHistory(data.exports);
      }
    } catch (error) {
      console.error('Failed to fetch export history:', error);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/profile/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({
          exportType,
          format: exportFormat
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Download the file
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `woofadaar-profile-${exportType}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setSuccess(`Profile exported successfully! ${exportType} data downloaded.`);
        fetchExportHistory(); // Refresh history
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to export profile');
      }
    } catch (error) {
      setError('Network error during export');
    } finally {
      setLoading(false);
    }
  };

  const getExportTypeInfo = (type: string) => {
    switch (type) {
      case 'basic':
        return {
          icon: <FileText className="w-5 h-5 text-blue-600" />,
          title: 'Basic Export',
          description: 'Essential profile and dog information',
          includes: ['Profile basics', 'Dog summaries', 'Health IDs']
        };
      case 'full':
        return {
          icon: <Database className="w-5 h-5 text-green-600" />,
          title: 'Full Export',
          description: 'Complete profile with all data and history',
          includes: ['All profile data', 'Complete dog records', 'Health logs', 'Share history', 'Audit logs']
        };
      default:
        return {
          icon: <FileText className="w-5 h-5 text-gray-600" />,
          title: 'Basic Export',
          description: 'Essential profile and dog information',
          includes: ['Profile basics', 'Dog summaries', 'Health IDs']
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Export Profile Data</h2>
            <p className="text-gray-600">Download your profile and dog information</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* Export Type Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['basic', 'full'] as const).map((type) => {
              const info = getExportTypeInfo(type);
              return (
                <div
                  key={type}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    exportType === type
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setExportType(type)}
                >
                  <div className="flex items-center mb-3">
                    <input
                      type="radio"
                      name="exportType"
                      value={type}
                      checked={exportType === type}
                      onChange={() => setExportType(type)}
                      className="mr-3"
                    />
                    {info.icon}
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">{info.title}</div>
                      <div className="text-sm text-gray-600">{info.description}</div>
                    </div>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {info.includes.map((item, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Export Format */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Format</h3>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="format"
                value="json"
                checked={exportFormat === 'json'}
                onChange={() => setExportFormat('json')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">JSON (Recommended)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={() => setExportFormat('csv')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">CSV</span>
            </label>
          </div>
        </div>

        {/* Export Button */}
        <div className="mb-6">
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {exportType === 'basic' ? 'Basic' : 'Full'} Profile
              </>
            )}
          </button>
        </div>

        {/* Export History */}
        {exportHistory.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <History className="w-5 h-5 mr-2 text-primary" />
              Recent Exports
            </h3>
            <div className="space-y-3">
              {exportHistory.slice(0, 5).map((export_) => (
                <div key={export_.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      {new Date(export_.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {(export_.data_size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Export Information</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Exports are automatically backed up to your account</li>
            <li>• Full exports include all historical data and logs</li>
            <li>• Basic exports are recommended for sharing with veterinarians</li>
            <li>• Data is exported in a secure, readable format</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 