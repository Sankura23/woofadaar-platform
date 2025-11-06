'use client';

import { motion } from 'framer-motion';
import { Instagram, Mail } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-neutral-milkWhite text-ui-textPrimary py-20 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-10 right-20 opacity-10">
        <div className="w-32 h-32 bg-primary-mint rounded-full" />
      </div>
      <div className="absolute bottom-10 left-20 opacity-10">
        <div className="w-40 h-40 bg-primary-coral rounded-full" />
      </div>

      <div className="max-width-container mx-auto section-padding relative z-10">
        {/* Top Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:col-span-1"
          >
            <h3 className="text-4xl font-bold text-primary-mint mb-4 font-display">
              Woofadaar
            </h3>
            <p className="text-lg text-ui-textSecondary mb-6 leading-relaxed">
              Helping you raise your dogs better, together.
            </p>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/woofadaarofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-primary-mint rounded-full flex items-center justify-center hover:bg-primary-coral transition-all duration-300 hover:scale-110"
              >
                <Instagram className="w-6 h-6 text-white" />
              </a>
              <a
                href="mailto:hello@woofadaar.com"
                className="w-12 h-12 bg-primary-mint rounded-full flex items-center justify-center hover:bg-primary-coral transition-all duration-300 hover:scale-110"
              >
                <Mail className="w-6 h-6 text-white" />
              </a>
            </div>
          </motion.div>

          {/* Links Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="lg:col-span-2 grid md:grid-cols-2 gap-8"
          >
            <div>
              <h4 className="font-bold text-xl mb-4 text-primary-mutedPurple">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-lg">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#community" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-lg">
                    Community
                  </a>
                </li>
                <li>
                  <a href="#events" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-lg">
                    Events
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xl mb-4 text-primary-mutedPurple">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <a href="/privacy" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-lg">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-lg">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/contact" className="text-ui-textSecondary hover:text-primary-mint transition-colors text-lg">
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
          className="pt-8 border-t-2 border-primary-mint/20"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-ui-textSecondary text-base">
              © 2025 Woofadaar. All rights reserved. Made with ❤️ for dogs.
            </p>
            <p className="text-primary-mint font-semibold text-lg">
              🐕 Every Bark Counts
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}