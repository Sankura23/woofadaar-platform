'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SwipeableCard from '@/components/mobile/SwipeableCard';
import TouchOptimizedButton from '@/components/mobile/TouchOptimizedButton';
import MobileViewport, { useMobileBreakpoint, usePWAInstall, useSafeArea } from '@/components/mobile/MobileViewport';
import { 
  Heart, 
  Trash2, 
  Archive, 
  Star, 
  MessageSquare, 
  Calendar,
  Download,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';

const MobileDemoPage: React.FC = () => {
  const [cards, setCards] = useState([
    { id: 1, title: 'Health Reminder', content: 'Time to log Buddy\'s daily health check', type: 'health' },
    { id: 2, title: 'Vet Appointment', content: 'Dr. Smith appointment tomorrow at 3 PM', type: 'appointment' },
    { id: 3, title: 'Community Question', content: 'How often should I bathe my Golden Retriever?', type: 'community' },
    { id: 4, title: 'AI Insight', content: 'Based on recent logs, consider adjusting exercise routine', type: 'ai' }
  ]);

  const { isMobile, isTablet, isDesktop } = useMobileBreakpoint();
  const { canInstall, promptInstall } = usePWAInstall();
  const safeArea = useSafeArea();

  const handleSwipeLeft = (cardId: number) => {
    console.log('Swiped left on card:', cardId);
    setCards(prev => prev.filter(card => card.id !== cardId));
  };

  const handleSwipeRight = (cardId: number) => {
    console.log('Swiped right on card:', cardId);
    setCards(prev => prev.filter(card => card.id !== cardId));
  };

  const handleInstallApp = async () => {
    const installed = await promptInstall();
    if (installed) {
      console.log('App installed successfully!');
    }
  };

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'health': return <Heart className="h-4 w-4" />;
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'community': return <MessageSquare className="h-4 w-4" />;
      case 'ai': return <Star className="h-4 w-4" />;
      default: return <Heart className="h-4 w-4" />;
    }
  };

  const getDeviceIcon = () => {
    if (isMobile) return <Smartphone className="h-4 w-4" />;
    if (isTablet) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getCurrentDevice = () => {
    if (isMobile) return 'Mobile';
    if (isTablet) return 'Tablet';
    return 'Desktop';
  };

  return (
    <MobileViewport enableViewportFix enableSafeArea>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Mobile Gestures Demo</h1>
            <p className="text-gray-600 mt-1">Try swiping, tapping, and long pressing</p>
          </div>

          {/* Device Detection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {getDeviceIcon()}
                <span>Device Detection</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Current Device:</span>
                  <Badge variant="secondary">{getCurrentDevice()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Touch Support:</span>
                  <Badge variant={typeof window !== 'undefined' && 'ontouchstart' in window ? 'default' : 'secondary'}>
                    {typeof window !== 'undefined' && 'ontouchstart' in window ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>PWA Installable:</span>
                  <Badge variant={canInstall ? 'default' : 'secondary'}>
                    {canInstall ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
              
              {canInstall && (
                <TouchOptimizedButton
                  onClick={handleInstallApp}
                  className="w-full mt-4"
                  hapticFeedback
                  rippleEffect
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </TouchOptimizedButton>
              )}
            </CardContent>
          </Card>

          {/* Safe Area Info */}
          {(safeArea.top > 0 || safeArea.bottom > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Safe Area Insets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Top: {safeArea.top}px</div>
                  <div>Bottom: {safeArea.bottom}px</div>
                  <div>Left: {safeArea.left}px</div>
                  <div>Right: {safeArea.right}px</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Touch Optimized Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Touch Optimized Buttons</CardTitle>
              <p className="text-sm text-gray-600">Try tapping and long pressing</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <TouchOptimizedButton
                  variant="default"
                  className="w-full"
                  hapticFeedback
                  rippleEffect
                  onClick={() => alert('Button tapped!')}
                  onLongPress={() => alert('Button long pressed!')}
                >
                  Tap or Long Press Me
                </TouchOptimizedButton>
                
                <TouchOptimizedButton
                  variant="outline"
                  className="w-full"
                  hapticFeedback={false}
                  rippleEffect
                  pressScale={0.9}
                  onClick={() => alert('No haptic feedback')}
                >
                  No Haptic Feedback
                </TouchOptimizedButton>
                
                <TouchOptimizedButton
                  variant="secondary"
                  className="w-full"
                  hapticFeedback
                  rippleEffect={false}
                  onClick={() => alert('No ripple effect')}
                >
                  No Ripple Effect
                </TouchOptimizedButton>
              </div>
            </CardContent>
          </Card>

          {/* Swipeable Cards */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Swipeable Cards</h2>
            <p className="text-sm text-gray-600 mb-4">
              Swipe left to archive, swipe right to favorite
            </p>
            
            <div className="space-y-3">
              {cards.map((card) => (
                <SwipeableCard
                  key={card.id}
                  onSwipeLeft={() => handleSwipeLeft(card.id)}
                  onSwipeRight={() => handleSwipeRight(card.id)}
                  leftAction={{
                    icon: <Archive className="h-5 w-5" />,
                    label: 'Archive',
                    color: 'linear-gradient(90deg, #ef4444, #dc2626)'
                  }}
                  rightAction={{
                    icon: <Star className="h-5 w-5" />,
                    label: 'Favorite',
                    color: 'linear-gradient(90deg, #22c55e, #16a34a)'
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      {getCardIcon(card.type)}
                      <span>{card.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{card.content}</p>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {card.type}
                      </Badge>
                    </div>
                  </CardContent>
                </SwipeableCard>
              ))}
              
              {cards.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">All cards swiped away!</p>
                    <TouchOptimizedButton
                      className="mt-4"
                      onClick={() => setCards([
                        { id: Date.now() + 1, title: 'New Health Reminder', content: 'Fresh health reminder added', type: 'health' },
                        { id: Date.now() + 2, title: 'New Community Post', content: 'Latest community discussion', type: 'community' }
                      ])}
                    >
                      Add More Cards
                    </TouchOptimizedButton>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Gesture Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Tap:</span>
                    <span>{isMobile ? 'Quick touch and release' : 'Click with mouse'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Long Press:</span>
                    <span>{isMobile ? 'Hold for 500ms' : 'Hold mouse button for 500ms'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Swipe:</span>
                    <span>{isMobile ? 'Quick drag gesture' : 'Click and drag quickly with mouse'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Pan:</span>
                    <span>{isMobile ? 'Drag to see preview actions' : 'Click and drag slowly to see preview actions'}</span>
                  </div>
                </div>
                
                {!isMobile && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium">Desktop Testing:</p>
                    <p className="text-xs text-blue-600 mt-1">
                      This demo simulates mobile gestures using mouse interactions. For best experience, open on a mobile device or use browser dev tools mobile simulation.
                    </p>
                  </div>
                )}
                
                {isMobile && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700 font-medium">Mobile Device Detected:</p>
                    <p className="text-xs text-green-600 mt-1">
                      All touch gestures are fully supported! Try swiping the cards above.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileViewport>
  );
};

export default MobileDemoPage;