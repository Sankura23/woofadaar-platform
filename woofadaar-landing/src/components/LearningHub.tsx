'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function LearningHub() {
  return (
    <section className="min-h-screen bg-primary-mint relative flex items-center">
      {/* Full screen container with proper padding */}
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left Side - Dog with Glasses */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-md lg:max-w-lg">
              <Image
                src="/assets/Black and White LP Dog Vector Square Image 2.svg"
                alt="Dog with glasses"
                width={500}
                height={500}
                className="w-full h-auto object-contain"
              />
            </div>
          </motion.div>

          {/* Right Side - Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-8 lg:pl-8"
          >
            {/* Main Heading */}
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Learning Hub
              <br />
              <span className="text-white">for Parents</span>
            </h2>

            {/* Tagline and Description */}
            <div className="space-y-6">
              <p className="text-3xl md:text-4xl font-semibold text-white leading-tight">
                The "I wish someone told me this earlier" hub.
              </p>

              <p className="text-lg md:text-xl lg:text-xl xl:text-2xl text-white/90 leading-relaxed">
                Myth-busters, how-tos, and short guides
                <br />
                for everyday dog parenting wins.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}