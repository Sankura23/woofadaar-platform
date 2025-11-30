'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import HeroSection from '@/components/HeroSection';
import ValueProposition from '@/components/ValueProposition';
import AppComingSoon from '@/components/AppComingSoon';
import IGStories from '@/components/IGStories';
import FoundingPack from '@/components/FoundingPack';
import JoinWaitlist from '@/components/JoinWaitlist';
import Footer from '@/components/Footer';

export default function Home() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowNav(window.scrollY < 100);
      if (window.scrollY >= 100) setMenuOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <main className="min-h-screen bg-neutral-milkWhite">
      {/* Hamburger Menu - matches Header positioning */}
      <div
        className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ${
          showNav ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end h-16 sm:h-20">
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 transition-all duration-300 hover:opacity-70"
              >
                <div className="flex flex-col gap-1.5">
                  <span className={`block w-7 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                  <span className={`block w-7 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
                  <span className={`block w-7 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </div>
              </button>

              {/* Dropdown */}
              <div
                className={`absolute top-full right-0 mt-3 bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ${
                  menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
              >
                <Link
                  href="/"
                  className="block px-8 py-4 text-lg text-primary-mutedPurple hover:text-primary-mint font-semibold transition-all duration-200"
                  onClick={() => setMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/blog"
                  className="block px-8 py-4 text-lg text-primary-mutedPurple hover:text-primary-mint font-semibold transition-all duration-200"
                  onClick={() => setMenuOpen(false)}
                >
                  Blog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

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