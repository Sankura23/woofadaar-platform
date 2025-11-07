'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

interface HeroSectionProps {
  onJoinWaitlist: () => void;
}

export default function HeroSection({ onJoinWaitlist }: HeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Section 2 content scroll tracking
  const section2Ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: section2Progress } = useScroll({
    target: section2Ref,
    offset: ["start end", "center start"]
  });



  // Animation values based on scroll progress for WOOFADAAR animation
  const dogOpacity = useTransform(scrollYProgress, [0, 0.5, 0.8], [1, 1, 0]);

  // Big W on dog's nose - stays static and fades out
  const bigWOpacity = useTransform(scrollYProgress, [0, 0.12, 0.2], [1, 1, 0]);

  // Letters move up FAST and disappear
  const lettersY = useTransform(scrollYProgress, [0.7, 0.9], [0, -600]);
  const lettersOpacity = useTransform(scrollYProgress, [0.9, 0.98], [1, 0]);

  const entireSectionOpacity = useTransform(scrollYProgress, [0.85, 1], [1, 0]);

  return (
    <>
      {/* Fixed Hero Section - Stays in place during scroll */}
      <section
        ref={containerRef}
        className="h-[400vh] relative"
      >
        <motion.div
          style={{ opacity: entireSectionOpacity, backgroundColor: '#3bbca8', pointerEvents: 'none' }}
          className="fixed inset-0"
        >

          {/* Animated Dog Image - Slides to right */}
          <motion.div
            style={{
              opacity: dogOpacity,
              top: '-10%'
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="relative w-full h-full scale-[2.0] sm:scale-[1.5] md:scale-[1.3] lg:scale-[1.20]">
              <Image
                src="/assets/Hero Section Dog Image.svg"
                alt="Dog vector"
                fill
                className="object-cover sm:object-contain"
                style={{
                  objectPosition: 'center 40%'
                }}
                priority
              />
            </div>
          </motion.div>

          {/* Big W on dog's nose - Static, only fades */}
          <motion.div
            style={{
              opacity: bigWOpacity,
              scale: 5,
              top: '32%',
              left: '28.2%'
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <Image src="/assets/w.svg" alt="W" width={700} height={700} />
          </motion.div>

          {/* WOOFADAAR Letters - All positioned at same height */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* W Letter - appears at final position */}
            <motion.div
              style={{
                opacity: useTransform(scrollYProgress, [0.25, 0.35, 0.9, 0.98], [0, 1, 1, 0]),
                y: lettersY,
                top: '37%',
                left: '13.2%'
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <Image src="/assets/w.svg" alt="W" width={700} height={700} />
            </motion.div>

            {/* O1 Letter */}
            <motion.div
              style={{
                opacity: useTransform(scrollYProgress, [0.3, 0.4, 0.9, 0.98], [0, 1, 1, 0]),
                y: lettersY,
                top: '37%',
                left: '17.4%'
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <Image src="/assets/o.svg" alt="O" width={700} height={700} />
            </motion.div>

            {/* O2 Letter */}
            <motion.div
              style={{
                opacity: useTransform(scrollYProgress, [0.35, 0.45, 0.9, 0.98], [0, 1, 1, 0]),
                y: lettersY,
                top: '37%',
                left: '20.7%'
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <Image src="/assets/o.svg" alt="O" width={700} height={700} />
            </motion.div>

            {/* F Letter */}
            <motion.div
              style={{
                opacity: useTransform(scrollYProgress, [0.4, 0.5, 0.9, 0.98], [0, 1, 1, 0]),
                y: lettersY,
                top: '37%',
                left: '24.4%'
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <Image src="/assets/f.svg" alt="F" width={700} height={700} />
            </motion.div>

            {/* A1 Letter */}
            <motion.div
              style={{
                opacity: useTransform(scrollYProgress, [0.4, 0.5, 0.9, 0.98], [0, 1, 1, 0]),
                y: lettersY,
                top: '37%',
                left: '27.6%'
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <Image src="/assets/a.svg" alt="A" width={700} height={700} />
            </motion.div>

            {/* D Letter */}
            <motion.div
              style={{
                opacity: useTransform(scrollYProgress, [0.45, 0.55, 0.9, 0.98], [0, 1, 1, 0]),
                y: lettersY,
                top: '37%',
                left: '31.7%'
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <Image src="/assets/d.svg" alt="D" width={700} height={700} />
            </motion.div>

            {/* A2 Letter */}
            <motion.div
              style={{
                opacity: useTransform(scrollYProgress, [0.5, 0.6, 0.9, 0.98], [0, 1, 1, 0]),
                y: lettersY,
                top: '37%',
                left: '35.2%'
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <Image src="/assets/a.svg" alt="A" width={700} height={700} />
            </motion.div>

            {/* A3 Letter */}
            <motion.div
              style={{
                opacity: useTransform(scrollYProgress, [0.55, 0.65, 0.9, 0.98], [0, 1, 1, 0]),
                y: lettersY,
                top: '37%',
                left: '39.3%'
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <Image src="/assets/a.svg" alt="A" width={700} height={700} />
            </motion.div>

            {/* R Letter */}
            <motion.div
              style={{
                opacity: useTransform(scrollYProgress, [0.6, 0.7, 0.9, 0.98], [0, 1, 1, 0]),
                y: lettersY,
                top: '37.7%',
                left: '43.2%'
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <Image src="/assets/r.svg" alt="R" width={700} height={700} />
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
            <motion.div
              animate={{
                y: [0, 10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-8 h-12 border-2 border-white rounded-full flex justify-center"
            >
              <div className="w-1 h-3 bg-white rounded-full mt-2" />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Hero Content Section - Normal section */}
      <motion.section
        ref={section2Ref}
        className="bg-neutral-milkWhite flex items-center relative overflow-hidden"
        style={{
          height: '100vh',
          opacity: useTransform(scrollYProgress, [0.9, 1], [0, 1]),
          zIndex: 50,
          position: 'relative'
        }}
      >
        {/* Background dog image */}
        <Image
          src="/assets/black-white-dog-square.svg"
          alt="Background dog"
          width={1200}
          height={1200}
          className="absolute right-0 bottom-0 pointer-events-none w-full sm:w-3/4 md:w-2/3 lg:w-3/5 max-w-[400px] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px] h-auto"
          style={{
            zIndex: 0
          }}
          priority
        />
        <motion.div
          className="text-center md:text-left max-w-2xl mx-auto md:mx-0 md:ml-12 lg:ml-20 px-4 sm:px-6 relative z-10"
        >
          <motion.h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-mutedPurple mb-4 sm:mb-6" style={{ pointerEvents: 'none' }}>
            <div className="whitespace-nowrap mb-2 sm:mb-4">
              {"Helping you raise your".split(" ").map((word, index) => (
                <motion.span
                  key={index}
                  style={{
                    display: 'inline-block',
                    marginRight: '8px',
                    opacity: useTransform(
                      section2Progress,
                      [0.01 + index * 0.015, 0.03 + index * 0.015],
                      [0, 1]
                    ),
                    y: useTransform(
                      section2Progress,
                      [0.01 + index * 0.015, 0.03 + index * 0.015],
                      [20, 0]
                    ),
                    filter: useTransform(
                      section2Progress,
                      [0.01 + index * 0.015, 0.03 + index * 0.015],
                      ["blur(8px)", "blur(0px)"]
                    )
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </div>
            <div className="whitespace-nowrap">
              {"dogs better, together".split(" ").map((word, index) => (
                <motion.span
                  key={index}
                  style={{
                    display: 'inline-block',
                    marginRight: '8px',
                    opacity: useTransform(
                      section2Progress,
                      [0.08 + index * 0.015, 0.10 + index * 0.015],
                      [0, 1]
                    ),
                    y: useTransform(
                      section2Progress,
                      [0.08 + index * 0.015, 0.10 + index * 0.015],
                      [20, 0]
                    ),
                    filter: useTransform(
                      section2Progress,
                      [0.08 + index * 0.015, 0.10 + index * 0.015],
                      ["blur(8px)", "blur(0px)"]
                    )
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </div>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-ui-textSecondary mb-6 sm:mb-8 md:mb-10"
            style={{
              opacity: useTransform(section2Progress, [0.12, 0.16], [0, 1]),
              x: useTransform(section2Progress, [0.12, 0.16], [-30, 0]),
              pointerEvents: 'none'
            }}
          >
            <span className="block sm:inline sm:whitespace-nowrap">Woofadaar is a community that helps you</span><br className="hidden sm:block" />learn, care and grow as a parent.
          </motion.p>

          <div className="relative z-50 flex justify-center md:justify-start" style={{ pointerEvents: 'auto' }}>
            <button
              onClick={onJoinWaitlist}
              type="button"
              style={{ pointerEvents: 'auto' }}
              className="bg-primary-mutedPurple text-white px-8 sm:px-10 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-300 min-h-[48px] min-w-[120px]"
            >
              Join Waitlist
            </button>
          </div>
        </motion.div>
      </motion.section>
    </>
  );
}