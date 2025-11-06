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
    <section className="relative min-h-screen bg-primary-coral overflow-hidden">
      <div className="w-full h-screen">
        <div className="grid lg:grid-cols-2 h-full items-center">
          {/* Left Side - Dog Image */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="h-full hidden lg:block"
          >
            <div className="relative w-full h-full">
              <Image
                src="/images/dogs/fawn-dog.svg"
                alt="Happy Dog"
                fill
                className="object-cover object-center"
                priority
              />
              <div className="absolute top-16 left-1/4 w-24 h-24 z-10">
                <Image
                  src="/icons/star-1.svg"
                  alt="Crown"
                  width={96}
                  height={96}
                  className="w-full h-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Right Side - Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-white px-8 lg:px-16 flex items-center justify-center"
          >
            <div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
                Become Part of Our
                <br />
                <span className="text-5xl md:text-6xl lg:text-7xl">FOUNDING PACK</span>
              </h2>

              <div className="space-y-4 mb-10">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <Image
                        src="/icons/star-2.svg"
                        alt="Star"
                        width={32}
                        height={32}
                        className="w-8 h-8"
                      />
                    </div>
                    <p className="text-2xl md:text-3xl font-medium italic">
                      {benefit}
                    </p>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onJoinWaitlist}
                className="bg-primary-beige text-primary-coral px-12 py-5 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 mb-8"
              >
                Get Early Access
              </motion.button>

              <div className="flex items-center gap-3">
                <Image
                  src="/icons/star-3.svg"
                  alt="Heart"
                  width={40}
                  height={40}
                  className="w-10 h-10"
                />
                <p className="text-2xl font-medium italic">
                  Your dog will thank you later!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
