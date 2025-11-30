'use client';

import { Instagram } from 'lucide-react';
import Image from 'next/image';

export default function MobileBlock() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-6">
      {/* Background Image */}
      <div className="absolute inset-0 bg-primary-mint">
        <div className="absolute inset-0 flex items-center justify-center -translate-y-32">
          <div className="relative w-[110%] h-auto aspect-square">
            <Image
              src="/mobile-bg.png"
              alt="Woofadaar"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full text-center translate-y-32">
        {/* Message */}
        <div className="mb-10">
          <p className="text-xl text-white/90 font-medium">
            Our landing page is optimized for desktop viewing. Please visit us on a desktop or laptop computer. Mobile experience coming soon!
          </p>
        </div>

        {/* Divider */}
        <div className="w-24 h-1 bg-white mx-auto mb-8 rounded-full"></div>

        {/* CTA */}
        <div className="space-y-6">

          {/* Social Link */}
          <div>
            <p className="text-sm text-white/80 mb-4">Follow us in the meantime:</p>
            <a
              href="https://www.instagram.com/woofadaarofficial/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-primary-mint px-8 py-4 rounded-full font-semibold hover:bg-white/90 transition-colors shadow-lg"
            >
              <Instagram className="w-5 h-5" />
              @woofadaarofficial
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-sm text-white/70">
          <p>© 2025 Woofadaar. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
