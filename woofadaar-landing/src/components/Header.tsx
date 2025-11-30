'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* W Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/assets/w-teal.svg"
              alt="Woofadaar"
              width={50}
              height={40}
              className="h-8 sm:h-10 w-auto"
            />
          </Link>

          {/* Hamburger Menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 transition-all duration-300 hover:opacity-70"
            >
              <div className="flex flex-col gap-1.5">
                <span className={`block w-7 h-0.5 bg-primary-mutedPurple transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-7 h-0.5 bg-primary-mutedPurple transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-7 h-0.5 bg-primary-mutedPurple transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
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
    </header>
  );
}
