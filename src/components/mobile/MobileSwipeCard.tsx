'use client';

import { useState, useRef, useEffect } from 'react';

interface SwipeCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
  className?: string;
  enableSwipe?: boolean;
}

export default function MobileSwipeCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100,
  className = '',
  enableSwipe = true
}: SwipeCardProps) {
  const [startX, setStartX] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableSwipe) return;
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enableSwipe || !startX) return;
    
    const touchX = e.touches[0].clientX;
    setCurrentX(touchX);
    
    const deltaX = touchX - startX;
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${deltaX}px)`;
      cardRef.current.style.opacity = `${1 - Math.abs(deltaX) / 300}`;
    }
  };

  const handleTouchEnd = () => {
    if (!enableSwipe || !startX || !currentX) return;
    
    const deltaX = currentX - startX;
    const absDelataX = Math.abs(deltaX);
    
    if (cardRef.current) {
      if (absDelataX > swipeThreshold) {
        // Swipe detected
        if (deltaX > 0 && onSwipeRight) {
          // Swipe right
          cardRef.current.style.transform = 'translateX(100%)';
          cardRef.current.style.opacity = '0';
          setTimeout(() => {
            onSwipeRight();
            resetCard();
          }, 200);
        } else if (deltaX < 0 && onSwipeLeft) {
          // Swipe left
          cardRef.current.style.transform = 'translateX(-100%)';
          cardRef.current.style.opacity = '0';
          setTimeout(() => {
            onSwipeLeft();
            resetCard();
          }, 200);
        } else {
          // No valid swipe handler, reset
          resetCard();
        }
      } else {
        // Not enough movement, reset
        resetCard();
      }
    }
    
    setStartX(null);
    setCurrentX(null);
    setIsDragging(false);
  };

  const resetCard = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateX(0)';
      cardRef.current.style.opacity = '1';
    }
  };

  return (
    <div
      ref={cardRef}
      className={`touch-pan-x transition-transform duration-200 ${isDragging ? '' : 'transition-all'} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      
      {/* Swipe Indicators */}
      {enableSwipe && isDragging && startX && currentX && (
        <>
          {/* Left swipe indicator */}
          {currentX < startX - 50 && onSwipeLeft && (
            <div className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium opacity-80 pointer-events-none">
              ← Delete
            </div>
          )}
          
          {/* Right swipe indicator */}
          {currentX > startX + 50 && onSwipeRight && (
            <div className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium opacity-80 pointer-events-none">
              Done →
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Hook for managing swipe gestures across the app
export function useSwipeGestures() {
  const [currentGesture, setCurrentGesture] = useState<{
    type: 'swipe-left' | 'swipe-right' | 'tap' | null;
    startTime: number;
  }>({ type: null, startTime: 0 });

  const registerSwipe = (type: 'swipe-left' | 'swipe-right' | 'tap') => {
    setCurrentGesture({
      type,
      startTime: Date.now()
    });

    // Clear gesture after animation
    setTimeout(() => {
      setCurrentGesture({ type: null, startTime: 0 });
    }, 500);
  };

  return {
    currentGesture: currentGesture.type,
    registerSwipe,
    isActive: currentGesture.type !== null
  };
}

// Swipeable list component for mobile
interface SwipeableListProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  onSwipeLeft?: (item: any, index: number) => void;
  onSwipeRight?: (item: any, index: number) => void;
  keyExtractor: (item: any, index: number) => string;
  className?: string;
}

export function SwipeableList({
  items,
  renderItem,
  onSwipeLeft,
  onSwipeRight,
  keyExtractor,
  className = ''
}: SwipeableListProps) {
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  const handleSwipeLeft = (item: any, index: number) => {
    const key = keyExtractor(item, index);
    setRemovingItems(prev => new Set([...prev, key]));
    
    setTimeout(() => {
      if (onSwipeLeft) {
        onSwipeLeft(item, index);
      }
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }, 300);
  };

  const handleSwipeRight = (item: any, index: number) => {
    if (onSwipeRight) {
      onSwipeRight(item, index);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item, index) => {
        const key = keyExtractor(item, index);
        const isRemoving = removingItems.has(key);
        
        return (
          <MobileSwipeCard
            key={key}
            onSwipeLeft={() => handleSwipeLeft(item, index)}
            onSwipeRight={() => handleSwipeRight(item, index)}
            className={`transition-all duration-300 ${
              isRemoving ? 'opacity-0 transform scale-95' : ''
            }`}
          >
            {renderItem(item, index)}
          </MobileSwipeCard>
        );
      })}
    </div>
  );
}

// Quick action swipe component
interface QuickActionSwipeProps {
  children: React.ReactNode;
  leftAction?: {
    icon: string;
    label: string;
    color: string;
    action: () => void;
  };
  rightAction?: {
    icon: string;
    label: string;
    color: string;
    action: () => void;
  };
  className?: string;
}

export function QuickActionSwipe({
  children,
  leftAction,
  rightAction,
  className = ''
}: QuickActionSwipeProps) {
  return (
    <div className={`relative ${className}`}>
      <MobileSwipeCard
        onSwipeLeft={leftAction?.action}
        onSwipeRight={rightAction?.action}
        className="relative"
      >
        {children}
      </MobileSwipeCard>
      
      {/* Background actions */}
      {leftAction && (
        <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 pointer-events-none">
          <div className={`flex items-center space-x-2 ${leftAction.color} text-white px-4 py-2 rounded-lg opacity-0 transition-opacity`}>
            <span>{leftAction.icon}</span>
            <span className="text-sm font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}
      
      {rightAction && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 pointer-events-none">
          <div className={`flex items-center space-x-2 ${rightAction.color} text-white px-4 py-2 rounded-lg opacity-0 transition-opacity`}>
            <span className="text-sm font-medium">{rightAction.label}</span>
            <span>{rightAction.icon}</span>
          </div>
        </div>
      )}
    </div>
  );
}