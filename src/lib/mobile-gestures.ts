// Week 10: Mobile Gesture and Touch Optimization Library
// Provides touch-friendly interactions and gesture support for PWA

import * as React from 'react';

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  duration: number;
  velocity: number;
}

export interface PinchGesture {
  scale: number;
  center: { x: number; y: number };
}

export interface GestureCallbacks {
  onSwipe?: (gesture: SwipeGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onTap?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onLongPress?: (point: TouchPoint) => void;
  onPan?: (deltaX: number, deltaY: number, point: TouchPoint) => void;
}

export interface GestureOptions {
  swipeThreshold: number; // Minimum distance for swipe (px)
  swipeTimeout: number; // Maximum time for swipe (ms)
  longPressTimeout: number; // Time for long press (ms)
  doubleTapTimeout: number; // Time between taps for double tap (ms)
  pinchThreshold: number; // Minimum scale change for pinch
  enablePreventDefault: boolean; // Prevent default touch behavior
}

class MobileGestureManager {
  private element: HTMLElement;
  private callbacks: GestureCallbacks;
  private options: GestureOptions;
  
  private touchStartPoints: TouchPoint[] = [];
  private touchCurrentPoints: TouchPoint[] = [];
  private lastTap: { point: TouchPoint; timestamp: number } | null = null;
  private longPressTimer: NodeJS.Timeout | null = null;
  private isPanning = false;
  private initialPinchDistance = 0;
  private initialPinchCenter = { x: 0, y: 0 };

  constructor(
    element: HTMLElement, 
    callbacks: GestureCallbacks, 
    options: Partial<GestureOptions> = {}
  ) {
    this.element = element;
    this.callbacks = callbacks;
    this.options = {
      swipeThreshold: 50,
      swipeTimeout: 300,
      longPressTimeout: 500,
      doubleTapTimeout: 300,
      pinchThreshold: 0.1,
      enablePreventDefault: true,
      ...options
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: !this.options.enablePreventDefault });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: !this.options.enablePreventDefault });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: !this.options.enablePreventDefault });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this));

    // Mouse events for desktop testing
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Prevent context menu on long press
    this.element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private handleTouchStart(event: TouchEvent): void {
    if (this.options.enablePreventDefault) {
      event.preventDefault();
    }

    this.touchStartPoints = this.getTouchPoints(event.touches);
    this.touchCurrentPoints = [...this.touchStartPoints];

    // Clear any existing long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }

    // Single touch - start long press timer
    if (event.touches.length === 1) {
      this.longPressTimer = setTimeout(() => {
        if (this.callbacks.onLongPress) {
          this.callbacks.onLongPress(this.touchStartPoints[0]);
        }
      }, this.options.longPressTimeout);
    }

    // Two finger pinch start
    if (event.touches.length === 2) {
      this.initialPinchDistance = this.getDistance(
        this.touchStartPoints[0],
        this.touchStartPoints[1]
      );
      this.initialPinchCenter = this.getCenter(
        this.touchStartPoints[0],
        this.touchStartPoints[1]
      );
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    if (this.options.enablePreventDefault) {
      event.preventDefault();
    }

    this.touchCurrentPoints = this.getTouchPoints(event.touches);

    // Clear long press timer if finger moves
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Single finger pan
    if (event.touches.length === 1 && this.touchStartPoints.length === 1) {
      const deltaX = this.touchCurrentPoints[0].x - this.touchStartPoints[0].x;
      const deltaY = this.touchCurrentPoints[0].y - this.touchStartPoints[0].y;
      
      // Start panning if movement threshold is met
      if (!this.isPanning && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        this.isPanning = true;
      }

      if (this.isPanning && this.callbacks.onPan) {
        this.callbacks.onPan(deltaX, deltaY, this.touchCurrentPoints[0]);
      }
    }

    // Two finger pinch
    if (event.touches.length === 2 && this.touchStartPoints.length === 2) {
      const currentDistance = this.getDistance(
        this.touchCurrentPoints[0],
        this.touchCurrentPoints[1]
      );
      const scale = currentDistance / this.initialPinchDistance;
      
      if (Math.abs(scale - 1) > this.options.pinchThreshold && this.callbacks.onPinch) {
        this.callbacks.onPinch({
          scale,
          center: this.getCenter(this.touchCurrentPoints[0], this.touchCurrentPoints[1])
        });
      }
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (this.options.enablePreventDefault) {
      event.preventDefault();
    }

    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Handle tap events only if not panning
    if (!this.isPanning && this.touchStartPoints.length === 1 && event.changedTouches.length === 1) {
      const touchPoint = this.touchStartPoints[0];
      
      // Check for double tap
      if (this.lastTap && 
          Date.now() - this.lastTap.timestamp < this.options.doubleTapTimeout &&
          this.getDistance(touchPoint, this.lastTap.point) < 20) {
        
        if (this.callbacks.onDoubleTap) {
          this.callbacks.onDoubleTap(touchPoint);
        }
        this.lastTap = null;
      } else {
        // Single tap
        if (this.callbacks.onTap) {
          this.callbacks.onTap(touchPoint);
        }
        this.lastTap = { point: touchPoint, timestamp: Date.now() };
        
        // Clear last tap after timeout
        setTimeout(() => {
          if (this.lastTap && Date.now() - this.lastTap.timestamp >= this.options.doubleTapTimeout) {
            this.lastTap = null;
          }
        }, this.options.doubleTapTimeout);
      }
    }

    // Handle swipe gesture
    if (!this.isPanning && this.touchStartPoints.length === 1 && event.changedTouches.length === 1) {
      const startPoint = this.touchStartPoints[0];
      const endPoint = this.getTouchPoint(event.changedTouches[0]);
      const distance = this.getDistance(startPoint, endPoint);
      const duration = endPoint.timestamp - startPoint.timestamp;
      
      if (distance >= this.options.swipeThreshold && duration <= this.options.swipeTimeout) {
        const direction = this.getSwipeDirection(startPoint, endPoint);
        const velocity = distance / duration;
        
        if (this.callbacks.onSwipe) {
          this.callbacks.onSwipe({ direction, distance, duration, velocity });
        }
      }
    }

    // Reset state
    this.isPanning = false;
    this.touchStartPoints = [];
    this.touchCurrentPoints = [];
  }

  private handleTouchCancel(event: TouchEvent): void {
    // Reset all state on touch cancel
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    this.isPanning = false;
    this.touchStartPoints = [];
    this.touchCurrentPoints = [];
  }

  // Mouse events for desktop testing
  private handleMouseDown(event: MouseEvent): void {
    const touchPoint: TouchPoint = {
      id: 0,
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    };
    
    this.touchStartPoints = [touchPoint];
    this.touchCurrentPoints = [touchPoint];
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.touchStartPoints.length === 0) return;

    const touchPoint: TouchPoint = {
      id: 0,
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    };
    
    this.touchCurrentPoints = [touchPoint];
    
    const deltaX = touchPoint.x - this.touchStartPoints[0].x;
    const deltaY = touchPoint.y - this.touchStartPoints[0].y;
    
    if (!this.isPanning && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      this.isPanning = true;
    }

    if (this.isPanning && this.callbacks.onPan) {
      this.callbacks.onPan(deltaX, deltaY, touchPoint);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (this.touchStartPoints.length === 0) return;

    const endPoint: TouchPoint = {
      id: 0,
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    };

    if (!this.isPanning) {
      if (this.callbacks.onTap) {
        this.callbacks.onTap(endPoint);
      }
    }

    // Reset state
    this.isPanning = false;
    this.touchStartPoints = [];
    this.touchCurrentPoints = [];
  }

  private getTouchPoints(touches: TouchList): TouchPoint[] {
    const points: TouchPoint[] = [];
    for (let i = 0; i < touches.length; i++) {
      points.push(this.getTouchPoint(touches[i]));
    }
    return points;
  }

  private getTouchPoint(touch: Touch): TouchPoint {
    return {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
  }

  private getDistance(point1: TouchPoint, point2: TouchPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getCenter(point1: TouchPoint, point2: TouchPoint): { x: number; y: number } {
    return {
      x: (point1.x + point2.x) / 2,
      y: (point1.y + point2.y) / 2
    };
  }

  private getSwipeDirection(startPoint: TouchPoint, endPoint: TouchPoint): 'left' | 'right' | 'up' | 'down' {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  public destroy(): void {
    // Remove all event listeners
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    this.element.removeEventListener('mousedown', this.handleMouseDown);
    this.element.removeEventListener('mousemove', this.handleMouseMove);
    this.element.removeEventListener('mouseup', this.handleMouseUp);
    
    // Clear timers
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }
}

// React hook for using gestures
export function useGestures(
  ref: React.RefObject<HTMLElement>,
  callbacks: GestureCallbacks,
  options?: Partial<GestureOptions>
) {
  const gestureManagerRef = React.useRef<MobileGestureManager | null>(null);

  React.useEffect(() => {
    if (ref.current) {
      gestureManagerRef.current = new MobileGestureManager(ref.current, callbacks, options);
    }

    return () => {
      if (gestureManagerRef.current) {
        gestureManagerRef.current.destroy();
      }
    };
  }, [ref, callbacks, options]);

  return gestureManagerRef.current;
}

// Mobile-specific CSS utilities
export const mobileStyles = {
  // Prevent text selection on touch
  noSelect: {
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    userSelect: 'none' as const
  },
  
  // Optimize touch targets
  touchFriendly: {
    minHeight: '44px',
    minWidth: '44px',
    padding: '12px'
  },
  
  // Smooth scrolling
  smoothScroll: {
    WebkitOverflowScrolling: 'touch',
    scrollBehavior: 'smooth' as const
  },
  
  // Remove tap highlights
  noTapHighlight: {
    WebkitTapHighlightColor: 'transparent'
  }
};

// Utility functions for mobile detection
export const mobileUtils = {
  isMobile: (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  isIOS: (): boolean => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },
  
  isAndroid: (): boolean => {
    return /Android/.test(navigator.userAgent);
  },
  
  isTouchDevice: (): boolean => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  
  getViewportHeight: (): number => {
    return window.visualViewport?.height || window.innerHeight;
  },
  
  // Handle viewport changes (useful for iOS Safari)
  onViewportChange: (callback: (height: number) => void): (() => void) => {
    const handler = () => {
      callback(mobileUtils.getViewportHeight());
    };
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handler);
      return () => window.visualViewport?.removeEventListener('resize', handler);
    } else {
      window.addEventListener('resize', handler);
      return () => window.removeEventListener('resize', handler);
    }
  }
};

export { MobileGestureManager };