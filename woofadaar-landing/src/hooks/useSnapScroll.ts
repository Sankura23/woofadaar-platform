'use client';

import { useEffect, useRef, useState } from 'react';

interface SnapScrollOptions {
  threshold?: number;
  snapDuration?: number;
}

export function useSnapScroll(options: SnapScrollOptions = {}) {
  const { threshold = 50, snapDuration = 800 } = options;
  const [isSnapping, setIsSnapping] = useState(false);
  const snapTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastScrollTimeRef = useRef<number>(0);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (isSnapping) return;

      const now = Date.now();
      lastScrollTimeRef.current = now;

      // Clear any existing timeout
      if (snapTimeoutRef.current) {
        clearTimeout(snapTimeoutRef.current);
      }

      // Set a new timeout to detect when scrolling has stopped
      snapTimeoutRef.current = setTimeout(() => {
        // Check if this timeout is still the latest one
        if (Date.now() - lastScrollTimeRef.current >= threshold) {
          snapToNearestSection();
        }
      }, threshold);
    };

    const snapToNearestSection = () => {
      setIsSnapping(true);

      // Get all sections with snap points
      const sections = document.querySelectorAll('[data-snap-section]');
      const currentScrollY = window.scrollY;
      const viewportHeight = window.innerHeight;

      let closestSection: Element | null = null;
      let minDistance = Infinity;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionTop = currentScrollY + rect.top;

        // Snap to the top of sections instead of middle
        const distance = Math.abs(sectionTop - currentScrollY);

        if (distance < minDistance && distance > 50) { // Only snap if not already very close
          minDistance = distance;
          closestSection = section;
        }
      });

      if (closestSection) {
        const rect = (closestSection as HTMLElement).getBoundingClientRect();
        const targetY = window.scrollY + rect.top;

        // Smooth scroll to the target section
        window.scrollTo({
          top: targetY,
          behavior: 'smooth'
        });

        // Reset snapping state after animation
        setTimeout(() => {
          setIsSnapping(false);
        }, snapDuration);
      } else {
        setIsSnapping(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (snapTimeoutRef.current) {
        clearTimeout(snapTimeoutRef.current);
      }
    };
  }, [isSnapping, threshold, snapDuration]);

  return { isSnapping };
}