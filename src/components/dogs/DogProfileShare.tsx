'use client';

import { useState } from 'react';
import { Share2, Copy, CheckCircle, Clock, Users, Shield, Link, Download } from 'lucide-react';

interface DogProfileShareProps {
  dogId: string;
  dogName: string;
  onClose: () => void;
}

interface ShareOptions {
  shareType: 'public' | 'private' | 'partner';
  expiresIn?: number; // in seconds
}

export default function DogProfileShare({ dogId, dogName, onClose }: DogProfileShareProps) {
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    shareType: 'public'
  });
  const [shareUrl, setShareUrl] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleShare = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/dogs/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify({
          dogId,
          shareType: shareOptions.shareType,
          expiresIn: shareOptions.expiresIn
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.share.share_url);
        setShareToken(data.share.share_token);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create share link');
      }
    } catch (error) {
      setError('Network error creating share link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const downloadQRCode = () => {
    // This would generate a QR code for the share URL
    const qrData = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
    const link = document.createElement('a');
    link.href = qrData;
    link.download = `dog-share-${dogName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getShareTypeInfo = (type: string) => {
    switch (type) {
      case 'public':
        return {
          icon: <Users className="w-5 h-5 text-green-600" />,
          title: 'Public Share',
          description: 'Anyone with the link can view the profile'
        };
      case 'private':
        return {
          icon: <Shield className="w-5 h-5 text-blue-600" />,
          title: 'Private Share',
          description: 'Only you and approved users can view'
        };
      case 'partner':
        return {
          icon: <Link className="w-5 h-5 text-purple-600" />,
          title: 'Partner Share',
          description: 'Only verified partners can access'
        };
      default:
        return {
          icon: <Users className="w-5 h-5 text-gray-600" />,
          title: 'Public Share',
          description: 'Anyone with the link can view the profile'
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Share {dogName}'s Profile</h2>
            <p className="text-sm text-gray-600">Create a shareable link for {dogName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Share Type Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Share Type</h3>
          <div className="space-y-3">
            {(['public', 'private', 'partner'] as const).map((type) => {
              const info = getShareTypeInfo(type);
              return (
                <div
                  key={type}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    shareOptions.shareType === type
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setShareOptions(prev => ({ ...prev, shareType: type }))}
                >
                  <input
                    type="radio"
                    name="shareType"
                    value={type}
                    checked={shareOptions.shareType === type}
                    onChange={() => setShareOptions(prev => ({ ...prev, shareType: type }))}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    {info.icon}
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">{info.title}</div>
                      <div className="text-sm text-gray-600">{info.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expiration Options */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Expiration (Optional)</h3>
          <div className="space-y-3">
            {[
              { label: 'No expiration', value: undefined },
              { label: '1 hour', value: 3600 },
              { label: '24 hours', value: 86400 },
              { label: '7 days', value: 604800 },
              { label: '30 days', value: 2592000 }
            ].map((option) => (
              <div
                key={option.value || 'never'}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  shareOptions.expiresIn === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setShareOptions(prev => ({ ...prev, expiresIn: option.value }))}
              >
                <input
                  type="radio"
                  name="expiration"
                  checked={shareOptions.expiresIn === option.value}
                  onChange={() => setShareOptions(prev => ({ ...prev, expiresIn: option.value }))}
                  className="mr-3"
                />
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-900">{option.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Share Button */}
        {!shareUrl && (
          <button
            onClick={handleShare}
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Share Link...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Generate Share Link
              </>
            )}
          </button>
        )}

        {/* Share URL Display */}
        {shareUrl && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Share Link</span>
                <span className="text-xs text-gray-500">Token: {shareToken.substring(0, 8)}...</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 text-sm bg-white border border-gray-300 rounded px-3 py-2"
                />
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={downloadQRCode}
                className="flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">QR Code</span>
              </button>
              <button
                onClick={() => {
                  setShareUrl('');
                  setShareToken('');
                }}
                className="flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm">New Link</span>
              </button>
            </div>

            {/* Share Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Share Information</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Share type: {shareOptions.shareType}</li>
                <li>• {shareOptions.expiresIn ? `Expires in ${shareOptions.expiresIn / 3600} hours` : 'No expiration'}</li>
                <li>• Anyone with this link can view {dogName}'s profile</li>
                <li>• You can revoke this link anytime from your dashboard</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 