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

  // Animation values based on scroll progress for WOOFADAAR animation
  const dogOpacity = useTransform(scrollYProgress, [0, 0.5, 0.8], [1, 1, 0]);

  // W letter animation - starts at dog's nose, moves left and scales down simultaneously
  const wX = useTransform(scrollYProgress, [0, 0.25], [0, -260]);
  const wY = useTransform(scrollYProgress, [0, 0.25], [0, 0]);
  const wScale = useTransform(scrollYProgress, [0, 0.25], [5, 1]);
  const wOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 1]);

  // Letters move up FAST and disappear
  const lettersY = useTransform(scrollYProgress, [0.7, 0.9], [0, -600]);
  const lettersOpacity = useTransform(scrollYProgress, [0.9, 0.98], [1, 0]);

  // W gets its initial positioning PLUS the same upward movement as other letters
  const wYCombined = useTransform(scrollYProgress, [0, 0.25, 0.7, 0.9], [0, 0, 0, -600]);

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

          {/* WOOFADAAR Letters - All positioned at same height */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* W Letter - starts at dog's nose, moves left */}
            <motion.div
              style={{
                opacity: lettersOpacity,
                x: wX,
                y: wYCombined,
                scale: wScale,
                top: '37%',
                left: '32%'
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

      {/* Hero Content Section - Separate section after animation */}
      <section className="bg-neutral-milkWhite flex items-center relative overflow-hidden" style={{ height: '100vh' }}>
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
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-left max-w-2xl ml-20 px-6 relative z-10"
        >
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-ui-textPrimary mb-6 font-display"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            viewport={{ once: true }}
          >
            <div>
              {"Helping you raise your dogs".split(" ").map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                    ease: "easeOut"
                  }}
                  viewport={{ once: true }}
                  className="inline-block mr-2"
                >
                  {word}
                </motion.span>
              ))}
            </div>
            <div>
              {"better, together.".split(" ").map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.5,
                    delay: 0.5 + index * 0.1,
                    ease: "easeOut"
                  }}
                  viewport={{ once: true }}
                  className="inline-block mr-2"
                >
                  {word}
                </motion.span>
              ))}
            </div>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-ui-textSecondary mb-10"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            Woofadaar is a community that helps you learn, care and grow as a pawrent.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 1.2, type: "spring", stiffness: 200 }}
            viewport={{ once: true }}
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
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            viewport={{ once: true }}
          >
            Get early app access + exclusive event invites + chance to win surprise gifts for your dog!
          </motion.p>
        </motion.div>
      </section>
    </>
  );
}