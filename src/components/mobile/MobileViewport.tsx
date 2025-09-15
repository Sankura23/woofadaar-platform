'use client';

import React, { useEffect, useState } from 'react';
import { mobileUtils } from '@/lib/mobile-gestures';

interface MobileViewportProps {
  children: React.ReactNode;
  enableViewportFix?: boolean; // Fix iOS Safari viewport issues
  enableSafeArea?: boolean; // Add safe area padding
  className?: string;
}

const MobileViewport: React.FC<MobileViewportProps> = ({
  children,
  enableViewportFix = true,
  enableSafeArea = true,
  className = ''
}) => {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  useEffect(() => {
    // Set initial viewport height
    setViewportHeight(mobileUtils.getViewportHeight());

    // Listen for viewport changes (especially important on iOS Safari)
    const cleanup = mobileUtils.onViewportChange((height) => {
      setViewportHeight(height);
    });

    // Get safe area insets
    if (enableSafeArea) {
      const computedStyle = getComputedStyle(document.documentElement);
      setSafeAreaInsets({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10)
      });
    }

    return cleanup;
  }, [enableSafeArea]);

  // Add CSS custom properties for safe areas
  useEffect(() => {
    if (enableSafeArea && typeof window !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --sat: env(safe-area-inset-top);
          --sab: env(safe-area-inset-bottom);
          --sal: env(safe-area-inset-left);
          --sar: env(safe-area-inset-right);
        }
      `;
      document.head.appendChild(style);

      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [enableSafeArea]);

  const containerStyle: React.CSSProperties = {
    ...(enableViewportFix && viewportHeight && {
      minHeight: `${viewportHeight}px`,
      height: `${viewportHeight}px`
    }),
    ...(enableSafeArea && {
      paddingTop: `${safeAreaInsets.top}px`,
      paddingBottom: `${safeAreaInsets.bottom}px`,
      paddingLeft: `${safeAreaInsets.left}px`,
      paddingRight: `${safeAreaInsets.right}px`
    }),
    WebkitOverflowScrolling: 'touch',
    overflowX: 'hidden',
    position: 'relative',
    width: '100%'
  };

  return (
    <div 
      className={`mobile-viewport ${className}`}
      style={containerStyle}
    >
      {children}
      
      {/* iOS Safari bottom bar compensation */}
      {mobileUtils.isIOS() && (
        <div 
          style={{ 
            height: 'env(keyboard-inset-height)',
            transition: 'height 0.3s ease'
          }} 
        />
      )}
    </div>
  );
};

// Hook for getting safe area insets
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateSafeArea = () => {
        const computedStyle = getComputedStyle(document.documentElement);
        setSafeArea({
          top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
          bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
          left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
          right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10)
        });
      };

      updateSafeArea();
      window.addEventListener('resize', updateSafeArea);
      window.addEventListener('orientationchange', updateSafeArea);

      return () => {
        window.removeEventListener('resize', updateSafeArea);
        window.removeEventListener('orientationchange', updateSafeArea);
      };
    }
  }, []);

  return safeArea;
};

// Hook for detecting mobile breakpoints
export const useMobileBreakpoint = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);

    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
};

// PWA install prompt hook
export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;

    try {
      const result = await installPrompt.prompt();
      const outcome = await result.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setCanInstall(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  };

  return { canInstall, promptInstall };
};

export default MobileViewport;