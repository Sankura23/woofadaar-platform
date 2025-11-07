'use client';

import { useState, useEffect } from 'react';
import HeroSection from '@/components/HeroSection';
import ValueProposition from '@/components/ValueProposition';
import AppComingSoon from '@/components/AppComingSoon';
import IGStories from '@/components/IGStories';
import FoundingPack from '@/components/FoundingPack';
import JoinWaitlist from '@/components/JoinWaitlist';
import Footer from '@/components/Footer';
import MobileBlock from '@/components/MobileBlock';

export default function Home() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isSmallScreen = window.innerWidth < 768;

      setIsMobile(isMobileDevice || isSmallScreen);
      setIsLoaded(true);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show nothing during initial load to prevent flash
  if (!isLoaded) {
    return null;
  }

  // Show mobile block for mobile devices
  if (isMobile) {
    return <MobileBlock />;
  }

  // Show full landing page for desktop
  return (
    <main className="min-h-screen bg-neutral-milkWhite">
      <HeroSection onJoinWaitlist={() => setWaitlistOpen(true)} />
      <ValueProposition />
      <AppComingSoon />
      <IGStories />
      <FoundingPack onJoinWaitlist={() => setWaitlistOpen(true)} />
      <JoinWaitlist isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
      <Footer />
    </main>
  );
}