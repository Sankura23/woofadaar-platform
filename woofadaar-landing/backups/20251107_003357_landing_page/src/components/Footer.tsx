'use client';

import { motion } from 'framer-motion';
import { Instagram, Mail } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-neutral-milkWhite text-ui-textPrimary py-12 sm:py-16 md:py-20 relative overflow-hidden z-[100]">
      <div className="max-width-container mx-auto section-padding relative z-10 px-6 sm:px-8">
        {/* Top Section - Centered */}
        <div className="flex flex-col items-center text-center mb-12 sm:mb-14 md:mb-16">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-6"
          >
            <div className="mb-4 flex justify-center">
              <Image
                src="/woofadaar-logo.svg"
                alt="Woofadaar"
                width={160}
                height={50}
                className="h-10 sm:h-11 md:h-12 w-auto"
              />
            </div>
            <p className="text-base sm:text-lg text-ui-textSecondary mb-4 sm:mb-6 leading-relaxed">
              Helping you raise your dogs better, together.
            </p>
            <div className="flex gap-3 sm:gap-4 justify-center">
              <a
                href="https://www.instagram.com/woofadaarofficial/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 sm:w-12 sm:h-12 bg-primary-mint rounded-full flex items-center justify-center hover:bg-primary-coral transition-all duration-300 hover:scale-110"
              >
                <Instagram className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </a>
              <a
                href="mailto:hello@woofadaar.com"
                className="w-11 h-11 sm:w-12 sm:h-12 bg-primary-mint rounded-full flex items-center justify-center hover:bg-primary-coral transition-all duration-300 hover:scale-110"
              >
                <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </a>
            </div>
          </motion.div>

        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="pt-6 sm:pt-8 border-t-2 border-primary-mint/20"
        >
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <p className="text-ui-textSecondary text-sm sm:text-base">
              © 2025 Woofadaar. All rights reserved.
            </p>
            <div className="flex gap-4 sm:gap-6">
              <a href="/privacy" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-sm sm:text-base">
                Privacy Policy
              </a>
              <a href="/contact" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-sm sm:text-base">
                Contact
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}