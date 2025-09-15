// Week 22 Phase 3: Social Share Button Component
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Instagram, 
  MessageCircle,
  Mail,
  Link,
  Copy,
  CheckCircle,
  Sparkles,
  Gift,
  Camera,
  Download,
  ExternalLink,
  Users,
  Heart
} from 'lucide-react';

interface SocialShareButtonProps {
  shareType: 'achievement' | 'milestone' | 'challenge' | 'dog_profile' | 'community_post' | 'referral';
  shareContent: {
    title: string;
    description: string;
    imageUrl?: string;
    url?: string;
    hashtags?: string[];
    pointsEarned?: number;
    dogName?: string;
    achievementName?: string;
    challengeName?: string;
  };
  userId?: string;
  onShare?: (platform: string) => void;
  compact?: boolean;
  showPointsPreview?: boolean;
}

interface ShareTemplate {
  platform: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  generateMessage: (content: any) => string;
  generateUrl: (message: string, url?: string) => string;
}

const SHARE_TEMPLATES: ShareTemplate[] = [
  {
    platform: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    bgColor: 'bg-blue-600',
    generateMessage: (content) => {
      switch (content.shareType) {
        case 'achievement':
          return `🏆 Just unlocked "${content.achievementName}" on Woofadaar! ${content.description} #WoofadaarAchievement #DogParents #India`;
        case 'milestone':
          return `🎉 ${content.dogName} reached a special milestone! ${content.description} So proud! 🐕❤️ #DogMilestone #WoofadaarFamily`;
        case 'challenge':
          return `💪 Completed the "${content.challengeName}" challenge on Woofadaar! ${content.description} #WoofadaarChallenge #DogCommunity`;
        case 'referral':
          return `🐕 Just joined India's best dog parent community! Amazing tips and expert advice. Join me with my referral code! #Woofadaar #DogParents`;
        default:
          return `${content.title} - ${content.description} #Woofadaar #DogParents #India`;
      }
    },
    generateUrl: (message, url) => 
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url || 'https://woofadaar.com')}&quote=${encodeURIComponent(message)}`
  },
  {
    platform: 'twitter',
    name: 'Twitter',
    icon: Twitter,
    color: '#1DA1F2',
    bgColor: 'bg-blue-400',
    generateMessage: (content) => {
      const hashtags = (content.hashtags || ['Woofadaar', 'DogParents', 'India']).join(' #');
      switch (content.shareType) {
        case 'achievement':
          return `🏆 Unlocked "${content.achievementName}" on @Woofadaar! ${content.description} #${hashtags}`;
        case 'milestone':
          return `🎉 ${content.dogName} hit a major milestone! ${content.description} 🐕❤️ #DogMilestone #${hashtags}`;
        case 'challenge':
          return `💪 Crushed the "${content.challengeName}" challenge! ${content.description} #WoofadaarChallenge #${hashtags}`;
        case 'referral':
          return `🐕 Loving @Woofadaar - India's premier dog parent community! Join me for expert advice & amazing community! #${hashtags}`;
        default:
          return `${content.title} ${content.description} #${hashtags}`;
      }
    },
    generateUrl: (message, url) => 
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url || 'https://woofadaar.com')}`
  },
  {
    platform: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageCircle,
    color: '#25D366',
    bgColor: 'bg-green-600',
    generateMessage: (content) => {
      switch (content.shareType) {
        case 'achievement':
          return `🏆 Hey! Just unlocked "${content.achievementName}" on Woofadaar! ${content.description}\n\nYou should join too - it's India's best dog parent community!\nDownload: https://woofadaar.com 🐕❤️`;
        case 'milestone':
          return `🎉 Amazing news! ${content.dogName} just reached a special milestone!\n\n${content.description}\n\nCheck out more on Woofadaar - India's premier dog community!\nhttps://woofadaar.com 🐕`;
        case 'challenge':
          return `💪 Just completed the "${content.challengeName}" challenge on Woofadaar!\n\n${content.description}\n\nJoin India's most active dog parent community: https://woofadaar.com 🏆`;
        case 'referral':
          return `🐕 I've been loving Woofadaar - India's best dog parent community! Amazing tips, expert advice, and great community.\n\nJoin me and we both get rewards!\nDownload: https://woofadaar.com 🎁`;
        default:
          return `${content.title}\n\n${content.description}\n\nCheck out Woofadaar: https://woofadaar.com 🐕`;
      }
    },
    generateUrl: (message) => 
      `https://wa.me/?text=${encodeURIComponent(message)}`
  },
  {
    platform: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    bgColor: 'bg-pink-600',
    generateMessage: (content) => {
      const hashtags = (content.hashtags || ['woofadaar', 'dogparents', 'india', 'dogcommunity']).join(' #');
      switch (content.shareType) {
        case 'achievement':
          return `🏆 Achievement Unlocked: "${content.achievementName}"!\n\n${content.description}\n\n#${hashtags} #achievement #proud`;
        case 'milestone':
          return `🎉 Milestone Alert! ${content.dogName} reached something special!\n\n${content.description}\n\n#${hashtags} #milestone #doglove`;
        case 'challenge':
          return `💪 Challenge Completed: "${content.challengeName}"!\n\n${content.description}\n\n#${hashtags} #challenge #community`;
        default:
          return `${content.title}\n\n${content.description}\n\n#${hashtags}`;
      }
    },
    generateUrl: (message) => 
      `https://www.instagram.com/` // Instagram doesn't support direct sharing with text
  },
  {
    platform: 'email',
    name: 'Email',
    icon: Mail,
    color: '#EA4335',
    bgColor: 'bg-red-600',
    generateMessage: (content) => {
      switch (content.shareType) {
        case 'achievement':
          return `Subject: 🏆 Just achieved "${content.achievementName}" on Woofadaar!\n\nHi there!\n\nI wanted to share some exciting news - I just unlocked "${content.achievementName}" on Woofadaar!\n\n${content.description}\n\nWoofadaar is India's premier dog parent community with amazing expert advice, helpful tips, and a wonderful community of dog lovers.\n\nYou should check it out: https://woofadaar.com\n\nBest regards!`;
        case 'milestone':
          return `Subject: 🎉 ${content.dogName} reached a special milestone!\n\nHi!\n\nI have some wonderful news to share - ${content.dogName} just reached a special milestone!\n\n${content.description}\n\nI've been tracking this through Woofadaar, India's best dog parent community. It's been incredibly helpful for managing ${content.dogName}'s health and connecting with other dog parents.\n\nCheck it out: https://woofadaar.com\n\nWarm regards!`;
        default:
          return `Subject: ${content.title}\n\n${content.description}\n\nCheck out Woofadaar - India's premier dog parent community: https://woofadaar.com`;
      }
    },
    generateUrl: (message) => 
      `mailto:?${message.replace('Subject: ', 'subject=').replace('\n\n', '&body=')}`
  }
];

const POINTS_REWARDS = {
  facebook: 15,
  twitter: 10,
  whatsapp: 8,
  instagram: 12,
  email: 5
};

export default function SocialShareButton({ 
  shareType, 
  shareContent, 
  userId, 
  onShare, 
  compact = false,
  showPointsPreview = true 
}: SocialShareButtonProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (platform: string) => {
    try {
      setIsSharing(true);
      
      const template = SHARE_TEMPLATES.find(t => t.platform === platform);
      if (!template) return;

      const message = template.generateMessage({ ...shareContent, shareType });
      const shareUrl = template.generateUrl(message, shareContent.url);

      // Track the share action
      await trackSocialShare(platform, shareType, message);
      
      // Open sharing URL
      if (platform !== 'instagram') {
        window.open(shareUrl, '_blank', 'width=600,height=400');
      }
      
      // Call callback
      onShare?.(platform);
      
      // Award points for sharing
      if (showPointsPreview) {
        await awardSharePoints(platform);
      }
      
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareMessage = async (platform: string) => {
    try {
      const template = SHARE_TEMPLATES.find(t => t.platform === platform);
      if (!template) return;

      const message = template.generateMessage({ ...shareContent, shareType });
      await navigator.clipboard.writeText(message);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const trackSocialShare = async (platform: string, type: string, content: string) => {
    try {
      await fetch('/api/gamification/social-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareType: type,
          platform,
          shareContent: {
            title: shareContent.title,
            description: shareContent.description,
            imageUrl: shareContent.imageUrl,
            message: content
          },
          shareMetadata: {
            userId,
            pointsEarned: POINTS_REWARDS[platform as keyof typeof POINTS_REWARDS] || 5
          }
        })
      });
    } catch (error) {
      console.error('Error tracking share:', error);
    }
  };

  const awardSharePoints = async (platform: string) => {
    try {
      const points = POINTS_REWARDS[platform as keyof typeof POINTS_REWARDS] || 5;
      await fetch('/api/points/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'social_share',
          sourceType: 'social_share',
          sourceId: `${shareType}_${platform}_${Date.now()}`,
          pointsAmount: points,
          metadata: {
            shareType,
            platform,
            shareContent: shareContent.title
          }
        })
      });
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  if (compact) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowShareModal(true)}
        className="flex items-center gap-2"
      >
        <Share2 className="w-4 h-4" />
        Share
        {showPointsPreview && (
          <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700">
            +{Math.max(...Object.values(POINTS_REWARDS))} pts
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowShareModal(true)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        disabled={isSharing}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share Achievement
        {showPointsPreview && (
          <Badge variant="secondary" className="ml-2 bg-white/20">
            +{Math.max(...Object.values(POINTS_REWARDS))} pts
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Share Your Success!</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShareModal(false)}
                  className="p-1"
                >
                  ✕
                </Button>
              </div>

              {/* Share Preview */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="flex items-start gap-3">
                  {shareContent.imageUrl && (
                    <img
                      src={shareContent.imageUrl}
                      alt="Share preview"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{shareContent.title}</h4>
                    <p className="text-sm text-gray-600">{shareContent.description}</p>
                    {shareContent.pointsEarned && (
                      <div className="flex items-center gap-1 mt-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-700">
                          +{shareContent.pointsEarned} points earned!
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Platform Buttons */}
              <div className="space-y-3 mb-6">
                <div className="text-sm font-medium text-gray-700 mb-3">Choose platform:</div>
                {SHARE_TEMPLATES.map((template) => (
                  <div key={template.platform} className="flex items-center gap-3">
                    <Button
                      onClick={() => handleShare(template.platform)}
                      disabled={isSharing}
                      className={`${template.bgColor} hover:opacity-90 flex-1 flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-3">
                        <template.icon className="w-5 h-5" />
                        <span>Share on {template.name}</span>
                      </div>
                      {showPointsPreview && (
                        <Badge variant="secondary" className="bg-white/20">
                          +{POINTS_REWARDS[template.platform as keyof typeof POINTS_REWARDS] || 5} pts
                        </Badge>
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyShareMessage(template.platform)}
                      className="p-2"
                      title="Copy message"
                    >
                      {copiedPlatform === template.platform ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Bonus Points Info */}
              {showPointsPreview && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Earn Points for Sharing!</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Share your achievements and milestones to earn bonus points and help grow our community!
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-green-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Build Community
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      Inspire Others
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Earn Rewards
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowShareModal(false)}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={() => handleShare('facebook')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Quick Share
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}