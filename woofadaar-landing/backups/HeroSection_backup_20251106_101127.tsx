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
  const bigWOpacity = useTransform(scrollYProgress, [0, 0.2, 0.3], [1, 1, 0]);

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
          style={{ opacity: entireSectionOpacity, backgroundColor: '#3bbca8' }}
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
            <div className="relative w-full h-full scale-[1.20]">
              <Image
                src="/assets/Hero Section Dog Image.svg"
                alt="Dog vector"
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>

          {/* Big W on dog's nose - Static, only fades */}
          <motion.div
            style={{
              opacity: bigWOpacity,
              scale: 5,
              top: '37%',
              left: '32%'
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
                left: '17.2%'
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
                left: '21%'
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
                left: '24.1%'
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
                left: '27.6%'
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
                left: '30.7%'
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
                left: '34.5%'
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
                left: '37.8%'
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
                left: '41.5%'
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
                top: '37.5%',
                left: '45%'
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
          opacity: useTransform(scrollYProgress, [0.9, 1], [0, 1])
        }}
      >
        {/* Background dog image */}
        <Image
          src="/assets/black-white-dog-square.svg"
          alt="Background dog"
          width={1200}
          height={1200}
          className="absolute right-0 bottom-0"
          style={{
            width: '70%',
            height: 'auto',
            maxWidth: '900px'
          }}
          priority
        />
        <motion.div
          className="text-left max-w-2xl ml-20 px-6 relative z-10"
        >
          <motion.h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-ui-textPrimary mb-6 font-display">
            <div>
              {"Helping you raise your dogs".split(" ").map((word, index) => (
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
            <div>
              {"better, together.".split(" ").map((word, index) => (
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
            className="text-2xl md:text-3xl text-ui-textSecondary mb-10"
            style={{
              opacity: useTransform(section2Progress, [0.12, 0.16], [0, 1]),
              x: useTransform(section2Progress, [0.12, 0.16], [-30, 0])
            }}
          >
            Woofadaar is a community that helps you learn, care and grow as a pawrent.
          </motion.p>

          <motion.div
            style={{
              opacity: useTransform(section2Progress, [0.18, 0.22], [0, 1]),
              scale: useTransform(section2Progress, [0.18, 0.22], [0.8, 1])
            }}
          >
            <motion.button
              onClick={onJoinWaitlist}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(59, 188, 168, 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              className="bg-primary-mint text-white px-10 py-5 rounded-full font-bold text-lg shadow-xl transition-all relative overflow-hidden group"
            >
              <span className="relative z-10">Join the Waitlist</span>
              <motion.div
                className="absolute inset-0 bg-primary-coral"
                initial={{ x: "-100%" }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.div>

          <motion.p
            className="text-sm text-ui-textTertiary mt-6 max-w-xl"
            style={{
              opacity: useTransform(section2Progress, [0.24, 0.28], [0, 1])
            }}
          >
            Get early app access + exclusive event invites + chance to win surprise gifts for your dog!
          </motion.p>
        </motion.div>
      </motion.section>
    </>
  );
}