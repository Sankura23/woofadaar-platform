'use client';

import React, { useRef, useState } from 'react';
import { useGestures, mobileStyles } from '@/lib/mobile-gestures';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  leftAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
  };
  rightAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
  };
  className?: string;
  disabled?: boolean;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  leftAction,
  rightAction,
  className,
  disabled = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [revealedAction, setRevealedAction] = useState<'left' | 'right' | null>(null);

  useGestures(cardRef, {
    onSwipe: (gesture) => {
      if (disabled) return;

      const { direction, distance, velocity } = gesture;
      
      // Only trigger swipe if it's fast enough or far enough
      if (velocity > 0.5 || distance > 100) {
        setIsAnimating(true);
        
        switch (direction) {
          case 'left':
            if (onSwipeLeft) {
              setTransform({ x: -window.innerWidth, y: 0 });
              setTimeout(() => {
                onSwipeLeft();
                resetCard();
              }, 200);
            }
            break;
          case 'right':
            if (onSwipeRight) {
              setTransform({ x: window.innerWidth, y: 0 });
              setTimeout(() => {
                onSwipeRight();
                resetCard();
              }, 200);
            }
            break;
          case 'up':
            if (onSwipeUp) {
              setTransform({ x: 0, y: -window.innerHeight });
              setTimeout(() => {
                onSwipeUp();
                resetCard();
              }, 200);
            }
            break;
          case 'down':
            if (onSwipeDown) {
              setTransform({ x: 0, y: window.innerHeight });
              setTimeout(() => {
                onSwipeDown();
                resetCard();
              }, 200);
            }
            break;
        }
      } else {
        // Snap back if swipe wasn't strong enough
        snapBack();
      }
    },
    
    onPan: (deltaX, deltaY) => {
      if (disabled || isAnimating) return;

      const maxX = 120; // Maximum horizontal displacement
      const damping = 0.8; // Reduce movement for better control
      
      const x = Math.max(-maxX, Math.min(maxX, deltaX * damping));
      const y = Math.max(-50, Math.min(50, deltaY * 0.3)); // Limited vertical movement
      
      setTransform({ x, y });
      
      // Show action hints based on pan distance
      if (Math.abs(x) > 40) {
        if (x > 0 && rightAction) {
          setRevealedAction('right');
        } else if (x < 0 && leftAction) {
          setRevealedAction('left');
        }
      } else {
        setRevealedAction(null);
      }
    }
  });

  const resetCard = () => {
    setTransform({ x: 0, y: 0 });
    setRevealedAction(null);
    setIsAnimating(false);
  };

  const snapBack = () => {
    setIsAnimating(true);
    setTransform({ x: 0, y: 0 });
    setRevealedAction(null);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const cardStyle = {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition: isAnimating ? 'transform 0.2s ease-out' : 'none',
    ...mobileStyles.noSelect,
    ...mobileStyles.noTapHighlight
  };

  const getActionOpacity = (side: 'left' | 'right') => {
    const absX = Math.abs(transform.x);
    if (side === 'left' && transform.x < 0) {
      return Math.min(absX / 60, 1);
    }
    if (side === 'right' && transform.x > 0) {
      return Math.min(absX / 60, 1);
    }
    return 0;
  };

  const getActionScale = (side: 'left' | 'right') => {
    const opacity = getActionOpacity(side);
    return 0.8 + opacity * 0.2;
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left Action */}
      {leftAction && (
        <div 
          className="absolute left-0 top-0 bottom-0 flex items-center justify-start pl-4 pointer-events-none z-0"
          style={{
            background: leftAction.color,
            width: '120px',
            opacity: getActionOpacity('left'),
            transform: `scale(${getActionScale('left')})`
          }}
        >
          <div className="flex flex-col items-center text-white">
            <div className="mb-1">{leftAction.icon}</div>
            <span className="text-xs font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* Right Action */}
      {rightAction && (
        <div 
          className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-4 pointer-events-none z-0"
          style={{
            background: rightAction.color,
            width: '120px',
            opacity: getActionOpacity('right'),
            transform: `scale(${getActionScale('right')})`
          }}
        >
          <div className="flex flex-col items-center text-white">
            <div className="mb-1">{rightAction.icon}</div>
            <span className="text-xs font-medium">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Main Card */}
      <Card
        ref={cardRef}
        className={cn(
          'relative z-10 cursor-grab active:cursor-grabbing',
          disabled && 'cursor-default',
          className
        )}
        style={cardStyle}
      >
        {children}
      </Card>

      {/* Visual feedback for revealed actions */}
      {revealedAction && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-full">
            Swipe to {revealedAction === 'left' ? leftAction?.label : rightAction?.label}
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeableCard;