'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function AppComingSoon() {
  return (
    <section className="min-h-screen bg-primary-mint relative overflow-hidden flex items-center">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-20 opacity-30">
          <Image src="/assets/icon-15.svg" alt="background decoration" width={80} height={80} className="rotate-45" />
        </div>
        <div className="absolute bottom-1/3 left-32 opacity-30">
          <Image src="/assets/icon-15.svg" alt="background decoration" width={60} height={60} className="-rotate-12" />
        </div>
        <div className="absolute top-1/2 right-20 opacity-30">
          <Image src="/assets/icon-15.svg" alt="background decoration" width={70} height={70} className="rotate-90" />
        </div>
      </div>

      <div className="max-width-container mx-auto section-padding">
        <div className="text-center">
          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 font-display"
          >
            We're Building The Happiest Corner for Dog Parents
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-12 font-display"
          >
            WOOFADAAR APP COMING SOON
          </motion.h2>

          {/* Content Box */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="bg-neutral-milkWhite rounded-3xl p-8 md:p-12 max-w-4xl mx-auto"
          >
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-primary-mint mb-8">
              We can't spill all the treats yet,<br />
              but here's what you can expect
            </h3>

            <div className="space-y-6 text-left">
              <div className="flex items-center text-lg md:text-xl text-gray-700">
                <Image src="/assets/icon-17.svg" alt="checkmark" width={24} height={24} className="mr-4 brightness-0" />
                <span>Answers, not noise.</span>
              </div>
              <div className="flex items-center text-lg md:text-xl text-gray-700">
                <Image src="/assets/icon-17.svg" alt="checkmark" width={24} height={24} className="mr-4 brightness-0" />
                <span>Support, not confusion.</span>
              </div>
              <div className="flex items-center text-lg md:text-xl text-gray-700">
                <Image src="/assets/icon-17.svg" alt="checkmark" width={24} height={24} className="mr-4 brightness-0" />
                <span>Fun, not loneliness.</span>
              </div>
              <div className="flex items-center text-lg md:text-xl text-gray-700">
                <Image src="/assets/icon-17.svg" alt="checkmark" width={24} height={24} className="mr-4 brightness-0" />
                <span>Your dog parent crew.</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}