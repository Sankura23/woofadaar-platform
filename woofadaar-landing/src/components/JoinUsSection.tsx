'use client';

import { motion } from 'framer-motion';
import { Gift, Calendar, Zap, Heart } from 'lucide-react';

interface JoinUsSectionProps {
  onJoinWaitlist: () => void;
}

const benefits = [
  {
    icon: Zap,
    title: 'Early app access',
    description: 'Be among the first to experience our revolutionary platform',
    color: 'bg-primary-mint',
  },
  {
    icon: Calendar,
    title: 'Exclusive event invites',
    description: 'Get VIP access to our community meetups and expert sessions',
    color: 'bg-primary-beige',
  },
  {
    icon: Gift,
    title: 'Surprise gifts for your dog',
    description: 'Win special treats and toys curated just for your furry friend',
    color: 'bg-primary-coral',
  },
  {
    icon: Heart,
    title: 'Priority support',
    description: 'Get direct access to our team for personalized assistance',
    color: 'bg-primary-mutedPurple',
  },
];

export default function JoinUsSection({ onJoinWaitlist }: JoinUsSectionProps) {
  return (
    <section className="py-24 bg-primary-mutedPurple relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-white rounded-full" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white rounded-full" />
      </div>

      <div className="max-width-container mx-auto section-padding relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16 text-white"
        >
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
            Join us and get:
          </h2>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Be part of something special and enjoy exclusive benefits as we build the future of dog parenting together.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl hover:bg-white/20 transition-all duration-300 h-full border border-white/20">
                <div className={`${benefit.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <benefit.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  {benefit.title}
                </h3>
                <p className="text-white/80 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.button
            onClick={onJoinWaitlist}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-primary-mutedPurple px-12 py-4 rounded-full font-bold text-xl shadow-xl hover:shadow-2xl transition-all"
          >
            Join the Waitlist Now
          </motion.button>
          <p className="text-white/80 text-sm mt-4">
            No spam, just tail-wagging updates 🐕
          </p>
        </motion.div>
      </div>
    </section>
  );
}