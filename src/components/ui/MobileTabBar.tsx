'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Tab({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex flex-col items-center justify-center flex-1 py-2 text-xs font-medium transition-colors touch-target ${
        active ? 'text-[#3bbca8]' : 'text-gray-600 hover:text-[#3bbca8]'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="mt-0.5">{label}</span>
    </Link>
  );
}

export default function MobileTabBar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 safe-bottom">
      <div className="mx-auto max-w-7xl px-2">
        <div className="flex items-center">
          <Tab href="/" label="Home" icon={<span>🏠</span>} active={isActive('/')} />
          <Tab href="/partners/directory" label="Partners" icon={<span>🧭</span>} active={isActive('/partners/directory')} />
          <div className="relative flex-1 flex items-center justify-center">
            <Link
              href="/profile/dogs/add"
              aria-label="Add Dog"
              className="absolute -top-6 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#3bbca8] text-white shadow-lg ring-4 ring-white touch-target"
            >
              <span className="text-xl">＋</span>
            </Link>
          </div>
          <Tab href="/community" label="Community" icon={<span>💬</span>} active={isActive('/community')} />
          <Tab href="/profile" label="Profile" icon={<span>👤</span>} active={isActive('/profile')} />
        </div>
      </div>
    </div>
  );
}


