'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';

const features = [
  {
    title: 'Trusted',
    titleLine2: 'Community',
    icon: '/icons/trusted-community-icon.svg',
    subtitle: 'Where dog parents feel understood.',
    description: 'Ask anything. Share everything.\nNo judgement. Only "same here" energy.',
    dogImage: '/assets/Brown LP Dog Vector Square Image 4.svg',
    bgColor: 'bg-primary-mint',
    textColor: 'text-white'
  },
  {
    title: 'Verified',
    titleLine2: 'Expert',
    titleLine3: 'Sessions',
    icon: '/icons/expert-sessions-icon.svg',
    subtitle: 'When research spirals aren\'t helping, we will.',
    description: 'Behavior, nutrition, training, grooming.\nReal advice from real experts.',
    dogImage: '/assets/Brown LP Dog Vector Square Image 1.svg',
    bgColor: 'bg-primary-beige',
    textColor: 'text-primary-mutedPurple'
  },
  {
    title: 'Dog Events',
    titleLine2: '& Meetups',
    icon: '/icons/events-meetups-icon.svg',
    subtitle: 'Because dogs don\'t make friends on calls!',
    description: 'Playdates, meetups, community events.\nFor your dog AND your social life.',
    dogImage: '/assets/Brown LP Dog Vector Square Image 5.svg',
    bgColor: 'bg-primary-mint',
    textColor: 'text-white'
  },
  {
    title: 'Health Tracking',
    titleLine2: '& Wellbeing',
    icon: '/icons/health-tracking-icon.svg',
    subtitle: 'Your dog\'s health simplified.',
    description: 'Track, monitor & improve your dog\'s wellbeing in\none simple platform.',
    dogImage: '/assets/Fawn Goldie LP Dog Vector Square Image 5.svg',
    bgColor: 'bg-primary-beige',
    textColor: 'text-primary-mutedPurple'
  },
  {
    title: 'Learning Hub',
    titleLine2: 'for Parents',
    icon: '/icons/learning-hub-icon.svg',
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
    <div>
      {/* Mobile Value Proposition - Simple stacked sections */}
      <div className="md:hidden">
        {/* Header Section */}
        <section className="min-h-screen bg-primary-beige flex items-center justify-center px-2">
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-primary-mutedPurple mb-6 font-sans"
            >
              <motion.span
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="block"
              >
                Because raising a dog
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="block"
              >
                shouldn't feel like a
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.5, delay: 0.6 }}
                viewport={{ once: true }}
                className="text-functional-error block"
              >
                solo mission.
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              viewport={{ once: true }}
              className="text-base text-ui-textSecondary max-w-4xl mx-auto font-sans"
            >
              From health tracking to community support, we've built the most comprehensive
              platform for pet parents who want the best for their furry friends.
            </motion.p>
          </div>
        </section>

        {features.map((feature, index) => (
          <section
            key={feature.title}
            className={`${feature.bgColor} relative flex flex-col min-h-screen`}
          >
            {/* Text content */}
            <div className="text-center w-full max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-4">
              {/* Title with Icon */}
              <div className="mb-4 flex flex-col items-center">
                <h2 className={`text-3xl font-bold ${feature.textColor} leading-tight mb-2 font-sans`}>
                  {feature.title}
                </h2>
                {feature.titleLine2 && !(feature as any).titleLine3 && (
                  <div className="relative">
                    <h2 className={`text-3xl font-bold ${feature.textColor} leading-tight font-sans`}>
                      {feature.titleLine2}
                    </h2>
                    {feature.icon && (
                      <Image src={feature.icon} alt="icon" width={35} height={35} className="absolute right-[-40px] top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                )}
                {(feature as any).titleLine3 && (
                  <>
                    <div className="relative mb-1">
                      <h2 className={`text-3xl font-bold ${feature.textColor} leading-tight font-sans`}>
                        {feature.titleLine2}
                      </h2>
                      {feature.icon && (
                        <Image src={feature.icon} alt="icon" width={35} height={35} className="absolute left-[-40px] top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <h2 className={`text-3xl font-bold ${feature.textColor} leading-tight font-sans`}>
                      {(feature as any).titleLine3}
                    </h2>
                  </>
                )}
              </div>

              {/* Subtitle */}
              <h3 className={`text-lg sm:text-xl font-bold ${feature.textColor} mb-3 font-sans`}>
                {feature.subtitle}
              </h3>

              {/* Description */}
              <p className={`text-sm sm:text-base ${feature.textColor} leading-relaxed whitespace-pre-line font-sans`}>
                {feature.description}
              </p>
            </div>

            {/* Dog image - Match HeroSection proportions exactly */}
            <div className="absolute bottom-0 left-0 right-0 w-full max-w-sm mx-auto">
              <div className="relative aspect-square w-full">
                <Image
                  src={feature.dogImage}
                  alt={feature.title}
                  fill
                  className="object-contain object-bottom"
                />
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Desktop Value Proposition - Complex scroll animations */}
      <section
        ref={containerRef}
        className="h-[1200vh] relative z-40 hidden md:block"
        style={{ marginTop: '-100vh' }}
      >
        {/* Scrolling container that overlaps section 2 */}
        <motion.div
          className="relative h-[1200vh] z-30"
          style={{
            opacity: useTransform(scrollYProgress, [0, 0.1, 0.95, 0.99], [0, 1, 1, 0]),
            pointerEvents: useTransform(scrollYProgress,
              [0, 0.05, 0.95, 0.99],
              ['none', 'auto', 'auto', 'none']
            ) as any
          }}
        >
        {/* Header Section */}
        <motion.div
          style={{
            opacity: useTransform(scrollYProgress, [0, 0.1, 0.22, 0.28], [0, 1, 1, 0])
          }}
          className="fixed inset-0 bg-primary-beige flex items-center justify-center"
        >
          <div className="max-width-container mx-auto section-padding text-center px-4 sm:px-6">
            <motion.h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-mutedPurple mb-6 sm:mb-8 flex flex-col items-center">
              <div className="mb-2">
                {"Because raising a dog".split(" ").map((word, index) => (
                  <motion.span
                    key={index}
                    style={{
                      display: 'inline-block',
                      marginRight: '16px',
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
              </div>
              <div className="whitespace-nowrap">
                {"shouldn't feel like a".split(" ").map((word, index) => (
                  <motion.span
                    key={index + 4}
                    style={{
                      display: 'inline-block',
                      marginRight: '16px',
                      opacity: useTransform(
                        scrollYProgress,
                        [0.01 + (index + 4) * 0.015, 0.03 + (index + 4) * 0.015],
                        [0, 1]
                      ),
                      y: useTransform(
                        scrollYProgress,
                        [0.01 + (index + 4) * 0.015, 0.03 + (index + 4) * 0.015],
                        [20, 0]
                      ),
                      filter: useTransform(
                        scrollYProgress,
                        [0.01 + (index + 4) * 0.015, 0.03 + (index + 4) * 0.015],
                        ["blur(8px)", "blur(0px)"]
                      )
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
                {"solo mission.".split(" ").map((word, index) => (
                  <motion.span
                    key={index + 9}
                    className="text-functional-error"
                    style={{
                      display: 'inline-block',
                      marginRight: '16px',
                      opacity: useTransform(
                        scrollYProgress,
                        [0.01 + (index + 9) * 0.015, 0.03 + (index + 9) * 0.015],
                        [0, 1]
                      ),
                      y: useTransform(
                        scrollYProgress,
                        [0.01 + (index + 9) * 0.015, 0.03 + (index + 9) * 0.015],
                        [20, 0]
                      ),
                      filter: useTransform(
                        scrollYProgress,
                        [0.01 + (index + 9) * 0.015, 0.03 + (index + 9) * 0.015],
                        ["blur(8px)", "blur(0px)"]
                      )
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </div>
            </motion.h2>
            <motion.p
              className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-ui-textSecondary max-w-4xl mx-auto px-2 sm:px-4"
              style={{
                opacity: useTransform(scrollYProgress, [0.18, 0.22], [0, 1]),
                x: useTransform(scrollYProgress, [0.18, 0.22], [-30, 0])
              }}
            >
              From health tracking to community support, we've built the most comprehensive
              platform for pet parents who want the best for their furry friends.
            </motion.p>
          </div>
        </motion.div>

        {/* Features */}
        {features.map((feature, index) => {
          const startProgress = 0.28 + (index * 0.14);
          const endProgress = startProgress + 0.14;

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
                    className={`${index === 0 || index === 2 || index === 4 ? "lg:order-2" : ""} px-6 sm:px-8 md:px-10 ${index === 1 || index === 3 ? "lg:pl-20 lg:pr-14 xl:pl-28 xl:pr-20" : "lg:px-14 xl:px-20"} flex items-center justify-center`}
                    style={{
                      y: useTransform(
                        scrollYProgress,
                        [startProgress - 0.05, startProgress + 0.05],
                        [20, 0]
                      )
                    }}
                  >
                    <div className="text-center lg:text-left">
                      {feature.titleLine2 ? (
                        <div className="mb-4 sm:mb-6">
                          <h3 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold ${feature.textColor} leading-tight mb-2`}>
                            {feature.title}
                          </h3>
                          <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 md:gap-4">
                            <h3 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold ${feature.textColor} leading-tight`}>
                              {feature.titleLine2}
                            </h3>
                            {feature.icon && <Image src={feature.icon} alt="icon" width={index === 2 ? 60 : 55} height={index === 2 ? 60 : 55} className="sm:w-[80px] sm:h-[80px] md:w-[90px] md:h-[90px] lg:w-[100px] lg:h-[100px]" />}
                          </div>
                        </div>
                      ) : (
                        <h3 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold ${feature.textColor} mb-4 sm:mb-6 leading-tight`}>
                          {feature.title}
                        </h3>
                      )}
                      <h4 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl ${feature.textColor} mb-4 sm:mb-6 ${index === 0 || index === 1 || index === 2 || index === 3 || index === 4 ? 'font-bold' : 'font-medium'} leading-tight`}>
                        {feature.subtitle}
                      </h4>
                      <p className={`text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl ${feature.textColor} leading-relaxed whitespace-pre-line`}>
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>

                  {/* Feature Image */}
                  <motion.div
                    className={`${index === 0 || index === 2 || index === 4 ? "lg:order-1" : ""} h-full ${index === 0 || index === 3 ? "flex items-end" : ""}`}
                    style={{
                      scale: useTransform(
                        scrollYProgress,
                        [startProgress - 0.05, startProgress + 0.05, endProgress - 0.05, endProgress + 0.05],
                        [1.05, 1, 1, 1.05]
                      )
                    }}
                  >
                    <div className={`relative w-full ${index === 0 ? "h-[85%]" : index === 3 ? "h-[80%]" : "h-full"}`}>
                      <Image
                        src={feature.dogImage}
                        alt={feature.title}
                        fill
                        className={`${index === 0 || index === 3 ? "object-contain object-bottom" : "object-cover object-center"} ${index === 4 ? "scale-x-[-1]" : ""}`}
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
    </div>
  );
}
