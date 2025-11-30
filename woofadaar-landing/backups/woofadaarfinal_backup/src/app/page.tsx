'use client';

import { useState } from 'react';
import HeroSection from '@/components/HeroSection';
import ValueProposition from '@/components/ValueProposition';
import AppComingSoon from '@/components/AppComingSoon';
import IGStories from '@/components/IGStories';
import FoundingPack from '@/components/FoundingPack';
import JoinWaitlist from '@/components/JoinWaitlist';
import Footer from '@/components/Footer';

export default function Home() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

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