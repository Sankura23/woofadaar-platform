'use client';

import React, { useRef, useState } from 'react';
import { useGestures, mobileStyles } from '@/lib/mobile-gestures';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TouchOptimizedButtonProps extends ButtonProps {
  hapticFeedback?: boolean;
  rippleEffect?: boolean;
  pressScale?: number;
  onLongPress?: () => void;
  longPressDelay?: number;
}

const TouchOptimizedButton: React.FC<TouchOptimizedButtonProps> = ({
  children,
  className,
  hapticFeedback = true,
  rippleEffect = true,
  pressScale = 0.95,
  onLongPress,
  longPressDelay = 500,
  onClick,
  disabled,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const triggerHapticFeedback = () => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
  };

  const addRipple = (x: number, y: number) => {
    if (!rippleEffect || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const rippleX = x - rect.left - size / 2;
    const rippleY = y - rect.top - size / 2;

    const newRipple = {
      id: Date.now(),
      x: rippleX,
      y: rippleY
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  };

  useGestures(buttonRef, {
    onTap: (point) => {
      if (disabled) return;

      triggerHapticFeedback();
      addRipple(point.x, point.y);
      
      if (onClick) {
        onClick({} as React.MouseEvent<HTMLButtonElement>);
      }
    },

    onLongPress: (point) => {
      if (disabled) return;

      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate([20, 10, 20]); // Pattern for long press
      }
      
      addRipple(point.x, point.y);
      
      if (onLongPress) {
        onLongPress();
      }
    }
  }, {
    longPressTimeout: longPressDelay
  });

  // Handle mouse/pointer events for visual feedback
  const handlePointerDown = () => {
    setIsPressed(true);
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  const buttonStyle = {
    transform: isPressed ? `scale(${pressScale})` : 'scale(1)',
    transition: 'transform 0.1s ease-out',
    ...mobileStyles.touchFriendly,
    ...mobileStyles.noSelect,
    ...mobileStyles.noTapHighlight,
    position: 'relative' as const,
    overflow: 'hidden' as const
  };

  return (
    <Button
      ref={buttonRef}
      className={cn('relative overflow-hidden', className)}
      style={buttonStyle}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      disabled={disabled}
      {...props}
    >
      {children}
      
      {/* Ripple Effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none animate-ping rounded-full bg-white opacity-30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '100px',
            height: '100px',
            animationDuration: '0.6s',
            animationFillMode: 'forwards'
          }}
        />
      ))}
    </Button>
  );
};

export default TouchOptimizedButton;