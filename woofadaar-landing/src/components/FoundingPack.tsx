'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface FoundingPackProps {
  onJoinWaitlist: () => void;
}

export default function FoundingPack({ onJoinWaitlist }: FoundingPackProps) {
  const benefits = [
    'Early app access.',
    'Exclusive event invites.',
    'Exclusive merch drops.',
    'Weekly dog parenting tips.',
    'A chance to win giveaways.'
  ];

  return (
    <section className="relative min-h-screen bg-primary-coral overflow-hidden z-50">
      <div className="w-full min-h-screen pt-16 pb-0 md:py-0">
        <div className="flex flex-col lg:grid lg:grid-cols-2 min-h-screen">
          {/* Content - Shown first on mobile, second on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-white px-6 sm:px-8 lg:px-12 flex items-center justify-start lg:pl-8 order-1 lg:order-2 flex-1 lg:flex-none"
          >
            <div className="w-full">
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 leading-tight text-center lg:text-left">
                Become Part of Our
                <br />
                <span>FOUNDING PACK</span>
              </h2>

              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-3 sm:gap-4"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <Image
                        src="/icons/star-2.svg"
                        alt="Star"
                        width={28}
                        height={28}
                        className="w-7 h-7 sm:w-8 sm:h-8"
                      />
                    </div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-medium italic">
                      {benefit}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col items-center lg:items-start">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onJoinWaitlist}
                  className="bg-primary-beige text-primary-coral px-8 sm:px-10 md:px-12 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 mb-6 sm:mb-8 relative z-50 cursor-pointer min-h-[48px]"
                  style={{ pointerEvents: 'auto' }}
                >
                  Join Waitlist
                </motion.button>

                <div className="flex items-center gap-2 sm:gap-3">
                  <Image
                    src="/icons/star-3.svg"
                    alt="Heart"
                    width={36}
                    height={36}
                    className="w-9 h-9 sm:w-10 sm:h-10"
                  />
                  <p className="text-xl sm:text-2xl font-medium italic">
                    Your dog will thank you later!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Dog Image - Shown second on mobile, first on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="lg:h-full order-2 lg:order-1 flex items-end w-full px-6 pb-0 lg:px-0 lg:pb-0"
          >
            <div className="relative w-full max-w-xs sm:max-w-sm mx-auto lg:max-w-none lg:mx-0 lg:w-[95%] h-full lg:h-[95%]">
              <div className="relative aspect-[3/4] lg:aspect-auto lg:h-full w-full">
                <Image
                  src="/images/dogs/founding-pack-dog.svg"
                  alt="Happy Dog"
                  fill
                  className="object-contain object-bottom"
                  priority
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
