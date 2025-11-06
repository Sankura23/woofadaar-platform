'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';

const features = [
  {
    title: 'Trusted Community',
    subtitle: 'Where dog parents finally feel understood.',
    description: 'Ask anything. Share everything.\nNo judgement. Only "same here" energy.',
    dogImage: '/assets/Brown LP Dog Vector Square Image 4.svg',
    bgColor: 'bg-primary-mint',
    textColor: 'text-white'
  },
  {
    title: 'Verified Expert Sessions',
    subtitle: 'When research spirals aren\'t helping, we will.',
    description: 'Behavior, nutrition, training, grooming.\nReal advice from real experts.',
    dogImage: '/assets/Brown LP Dog Vector Square Image 1.svg',
    bgColor: 'bg-primary-beige',
    textColor: 'text-primary-mutedPurple'
  },
  {
    title: 'Dog Events & Meetups',
    subtitle: 'Because dogs don\'t make friends on calls!',
    description: 'Playdates, meetups, community events.\nFor your dog AND your social life.',
    dogImage: '/assets/Brown LP Dog Vector Square Image 5.svg',
    bgColor: 'bg-primary-mint',
    textColor: 'text-white'
  },
  {
    title: 'Health Tracking & Wellbeing',
    subtitle: 'Your dog\'s health simplified.',
    description: 'Track, monitor & improve your dog\'s wellbeing in\none simple platform.',
    dogImage: '/assets/Fawn Goldie LP Dog Vector Square Image 5.svg',
    bgColor: 'bg-primary-beige',
    textColor: 'text-primary-mutedPurple'
  },
  {
    title: 'Learning Hub\nfor Parents',
    subtitle: 'The "I wish someone told me this earlier" hub.',
    description: 'Myth-busters, how-tos, and short guides\nfor everyday dog parenting wins.',
    dogImage: '/assets/Black and White LP Dog Vector Square Image 2.svg',
    bgColor: 'bg-primary-mint',
    textColor: 'text-white'
  }
];

export default function ValueProposition() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  return (
    <section
      ref={containerRef}
      className="h-[600vh] relative z-40"
      style={{ marginTop: '-100vh' }}
    >
      {/* Scrolling container that overlaps section 2 */}
      <motion.div
        className="relative h-[600vh] z-30"
        style={{
          opacity: useTransform(scrollYProgress, [0, 0.1, 0.95, 0.99], [0, 1, 1, 0])
        }}
      >
        {/* Header Section */}
        <motion.div
          style={{
            opacity: useTransform(scrollYProgress, [0, 0.1, 0.35, 0.4], [0, 1, 1, 0])
          }}
          className="fixed inset-0 bg-primary-beige flex items-center justify-center"
        >
          <div className="max-width-container mx-auto section-padding text-center">
            <motion.h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-ui-textPrimary mb-8 font-display">
              {"Because raising a dog shouldn't feel like a solo mission.".split(" ").map((word, index) => (
                <motion.span
                  key={index}
                  style={{
                    display: 'inline-block',
                    marginRight: '8px',
                    opacity: useTransform(
                      scrollYProgress,
                      [0.01 + index * 0.015, 0.03 + index * 0.015],
                      [0, 1]
                    ),
                    y: useTransform(
                      scrollYProgress,
                      [0.01 + index * 0.015, 0.03 + index * 0.015],
                      [20, 0]
                    ),
                    filter: useTransform(
                      scrollYProgress,
                      [0.01 + index * 0.015, 0.03 + index * 0.015],
                      ["blur(8px)", "blur(0px)"]
                    )
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.h2>
            <motion.p
              className="text-2xl md:text-3xl text-ui-textSecondary max-w-4xl mx-auto"
              style={{
                opacity: useTransform(scrollYProgress, [0.18, 0.22], [0, 1]),
                x: useTransform(scrollYProgress, [0.18, 0.22], [-30, 0])
              }}
            >
              From health tracking to community support, we've built the most comprehensive
              platform for modern pet parents who want the best for their furry friends.
            </motion.p>
          </div>
        </motion.div>

        {/* Features */}
        {features.map((feature, index) => {
          const startProgress = 0.35 + (index * 0.12);
          const endProgress = startProgress + 0.12;

          return (
            <motion.div
              key={feature.title}
              style={{
                opacity: useTransform(
                  scrollYProgress,
                  [startProgress - 0.05, startProgress + 0.05, endProgress - 0.05, endProgress + 0.05],
                  [0, 1, 1, 0]
                )
              }}
              className={`fixed inset-0 ${feature.bgColor} flex items-center z-50`}
            >
              <div className="w-full h-full">
                <div className="grid lg:grid-cols-2 h-full items-center">
                  {/* Feature Text */}
                  <motion.div
                    className={`${index === 2 ? "lg:order-2" : ""} px-8 lg:px-16 flex items-center justify-center`}
                    style={{
                      y: useTransform(
                        scrollYProgress,
                        [startProgress - 0.05, startProgress + 0.05],
                        [20, 0]
                      )
                    }}
                  >
                    <div>
                      <h3 className={`text-6xl md:text-7xl font-bold ${feature.textColor} mb-4 font-display leading-tight`}>
                        {feature.title}
                      </h3>
                      <h4 className={`text-3xl md:text-4xl ${feature.textColor} mb-8 font-medium leading-tight`}>
                        {feature.subtitle}
                      </h4>
                      <p className={`text-2xl md:text-3xl ${feature.textColor} leading-relaxed whitespace-pre-line`}>
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>

                  {/* Feature Image */}
                  <motion.div
                    className={`${index === 2 ? "lg:order-1" : ""} h-full`}
                    style={{
                      scale: useTransform(
                        scrollYProgress,
                        [startProgress - 0.05, startProgress + 0.05, endProgress - 0.05, endProgress + 0.05],
                        [1.05, 1, 1, 1.05]
                      )
                    }}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={feature.dogImage}
                        alt={feature.title}
                        fill
                        className="object-cover object-center"
                      />
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
