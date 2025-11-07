'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';

const features = [
  'Answers, not noise.',
  'Support, not confusion.',
  'Fun, not loneliness.',
  'Your dog parent crew.'
];

export default function AppComingSoon() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  return (
    <div>
      {/* Mobile App Coming Soon - Simple layout */}
      <section className="min-h-screen bg-primary-beige flex flex-col md:hidden py-12 px-6 justify-between">
        <div className="flex flex-col justify-center">
          {/* Heading */}
          <h1 className="text-5xl font-bold leading-none mb-6">
            <span className="text-primary-mutedPurple">The App.</span><br />
            <span className="text-primary-mint">Coming Soon.</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl text-primary-mutedPurple font-semibold mb-8">
            We're building the happiest corner for dog parents.
          </p>

          {/* Features List */}
          <div className="space-y-4 mb-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 text-primary-mutedPurple"
              >
                <Image src="/icons/bullet-icon.svg" alt="bullet" width={24} height={24} className="flex-shrink-0" />
                <p className="text-lg">
                  {feature}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* iPhone Mockup */}
        <div className="relative w-full max-w-[280px] mx-auto">
          <Image
            src="/images/iphone-mockup.png"
            alt="Woofadaar App Mockup"
            width={400}
            height={800}
            className="w-full h-auto"
            priority
          />
        </div>
      </section>

      {/* Desktop App Coming Soon - Scroll animations */}
      <section
        ref={containerRef}
        className="h-[200vh] relative z-40 hidden md:block"
      >
        <motion.div
          className="fixed inset-0 bg-primary-beige flex items-center z-30"
          style={{
            opacity: useTransform(scrollYProgress, [0, 0.1, 0.5, 0.75], [0, 1, 1, 0]),
            pointerEvents: useTransform(scrollYProgress,
              [0, 0.05, 0.7, 0.75],
              ['none', 'auto', 'auto', 'none']
            ) as any
          }}
        >
        <div className="max-width-container mx-auto section-padding w-full px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-center">
            {/* Left Side - iPhone Mockup */}
            <motion.div
              className="flex justify-center lg:justify-start"
              style={{
                x: useTransform(scrollYProgress, [0, 0.1], [-100, 0]),
                opacity: useTransform(scrollYProgress, [0, 0.1], [0, 1])
              }}
            >
              <div className="relative w-[250px] sm:w-[280px] md:w-[350px] lg:w-[400px]">
                <Image
                  src="/images/iphone-mockup.png"
                  alt="Woofadaar App Mockup"
                  width={400}
                  height={800}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </motion.div>

            {/* Right Side - Content */}
            <motion.div
              style={{
                x: useTransform(scrollYProgress, [0, 0.1], [100, 0]),
                opacity: useTransform(scrollYProgress, [0, 0.1], [0, 1])
              }}
            >
              {/* Heading */}
              <div className="mb-6 sm:mb-8 md:mb-10">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-none mb-4 sm:mb-6 font-sans">
                  <span className="text-primary-mutedPurple">The App.</span><br />
                  <span className="text-primary-mint whitespace-nowrap">Coming Soon.</span>
                </h1>
                {/* Tagline */}
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-primary-mutedPurple font-semibold">
                  We're building the happiest corner for dog parents.
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-3 sm:space-y-4 md:space-y-5">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-3 sm:gap-4 text-primary-mutedPurple"
                    style={{
                      opacity: useTransform(
                        scrollYProgress,
                        [0.1 + index * 0.05, 0.15 + index * 0.05],
                        [0, 1]
                      ),
                      y: useTransform(
                        scrollYProgress,
                        [0.1 + index * 0.05, 0.15 + index * 0.05],
                        [20, 0]
                      )
                    }}
                  >
                    <Image src="/icons/bullet-icon.svg" alt="bullet" width={20} height={20} className="flex-shrink-0 sm:w-[24px] sm:h-[24px]" />
                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl">
                      {feature}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
    </div>
  );
}