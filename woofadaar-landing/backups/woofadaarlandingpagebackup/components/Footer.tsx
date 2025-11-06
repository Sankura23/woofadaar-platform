'use client';

import { motion } from 'framer-motion';
import { Instagram, Mail } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-neutral-milkWhite text-ui-textPrimary py-12 sm:py-16 md:py-20 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-10 right-10 sm:right-20 opacity-10">
        <div className="w-20 h-20 sm:w-32 sm:h-32 bg-primary-mint rounded-full" />
      </div>
      <div className="absolute bottom-10 left-10 sm:left-20 opacity-10">
        <div className="w-24 h-24 sm:w-40 sm:h-40 bg-primary-coral rounded-full" />
      </div>

      <div className="max-width-container mx-auto section-padding relative z-10 px-6 sm:px-8">
        {/* Top Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 md:gap-12 mb-12 sm:mb-14 md:mb-16">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:col-span-1"
          >
            <h3 className="text-3xl sm:text-4xl font-bold text-primary-mint mb-3 sm:mb-4">
              Woofadaar
            </h3>
            <p className="text-base sm:text-lg text-ui-textSecondary mb-4 sm:mb-6 leading-relaxed">
              Helping you raise your dogs better, together.
            </p>
            <div className="flex gap-3 sm:gap-4">
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

          {/* Links Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="lg:col-span-2 grid md:grid-cols-2 gap-6 sm:gap-8"
          >
            <div>
              <h4 className="font-bold text-lg sm:text-xl mb-3 sm:mb-4 text-primary-mutedPurple">Quick Links</h4>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <a href="#features" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-base sm:text-lg">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#community" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-base sm:text-lg">
                    Community
                  </a>
                </li>
                <li>
                  <a href="#events" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-base sm:text-lg">
                    Events
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg sm:text-xl mb-3 sm:mb-4 text-primary-mutedPurple">Legal</h4>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <a href="/privacy" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-base sm:text-lg">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-base sm:text-lg">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/contact" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-base sm:text-lg">
                    Contact
                  </a>
                </li>
              </ul>
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
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-center md:text-left">
            <p className="text-ui-textSecondary text-sm sm:text-base">
              © 2025 Woofadaar. All rights reserved. Made with ❤️ for dogs.
            </p>
            <p className="text-primary-mint font-semibold text-base sm:text-lg">
              🐕 Every Bark Counts
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}