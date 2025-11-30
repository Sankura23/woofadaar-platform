'use client';

import { motion } from 'framer-motion';
import { Mail, Instagram, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-mint/10 via-primary-purple/10 to-primary-coral/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-ui-border">
        <div className="max-width-container mx-auto section-padding py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-ui-textSecondary hover:text-primary-mint transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-width-container mx-auto section-padding py-12 sm:py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-ui-textPrimary mb-4 sm:mb-6">
              Get in Touch
            </h1>
            <p className="text-lg sm:text-xl text-ui-textSecondary leading-relaxed">
              Have questions or feedback? We'd love to hear from you!
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid gap-6 sm:gap-8 mb-12">
            {/* Email Card */}
            <motion.a
              href="mailto:hello@woofadaar.com"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-8 sm:p-10 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary-mint rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl font-bold text-ui-textPrimary mb-2">
                    Email Us
                  </h2>
                  <p className="text-ui-textSecondary mb-3">
                    For general inquiries, feedback, or support
                  </p>
                  <p className="text-primary-mint text-lg sm:text-xl font-semibold group-hover:underline">
                    hello@woofadaar.com
                  </p>
                </div>
              </div>
            </motion.a>

            {/* Instagram Card */}
            <motion.a
              href="https://www.instagram.com/woofadaarofficial/"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-8 sm:p-10 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Instagram className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl font-bold text-ui-textPrimary mb-2">
                    Follow Us
                  </h2>
                  <p className="text-ui-textSecondary mb-3">
                    Join our community and stay updated
                  </p>
                  <p className="text-primary-purple text-lg sm:text-xl font-semibold group-hover:underline">
                    @woofadaarofficial
                  </p>
                </div>
              </div>
            </motion.a>
          </div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-primary-mint/10 rounded-2xl p-6 sm:p-8 text-center"
          >
            <p className="text-ui-textSecondary text-base sm:text-lg leading-relaxed">
              We typically respond within 24-48 hours during business days.<br />
              Thank you for being part of the Woofadaar community! 🐾
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
