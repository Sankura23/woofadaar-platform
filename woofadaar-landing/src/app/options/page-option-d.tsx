'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setEmail('');
    }, 3000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Option D: Story-driven + Professional + Gradients */}

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-lg z-50 border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <span className="font-bold text-xl text-gray-800">Woofadaar</span>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            Join Our Journey
          </motion.button>
        </div>
      </nav>

      {/* Hero Story Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-8">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                A Story of Love, Care & Innovation
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Every Dog Deserves
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Extraordinary Care
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              We believe every tail wag tells a story. Every bark carries meaning.
              Woofadaar is more than an app—it's your companion in the beautiful journey of dog parenthood.
            </p>
          </motion.div>

          {/* Story Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-8 mb-16"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-100/50">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-3xl">🐕</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">The Beginning</h3>
              <p className="text-gray-600">
                It started with a simple truth: every dog parent wants the best for their furry family member,
                but finding reliable, personalized care has always been a challenge.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-100/50">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-3xl">💡</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">The Vision</h3>
              <p className="text-gray-600">
                What if technology could bridge this gap? What if every dog parent had access to expert care,
                a supportive community, and tools to ensure their pet's happiness?
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-100/50">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">The Future</h3>
              <p className="text-gray-600">
                Today, we're building that future. A world where every dog receives the love, care,
                and attention they deserve, powered by innovation and community.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Email Signup Section */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-3xl shadow-2xl border border-gray-100/50 p-12 text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Be Part of This
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Story</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of dog parents who are already part of our journey.
              Be the first to experience the future of dog care.
            </p>

            <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
              <div className="bg-white rounded-2xl shadow-lg p-3 flex gap-3 border border-gray-100">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="flex-1 px-6 py-4 outline-none text-lg bg-transparent"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  {isSubmitted ? (
                    <span className="flex items-center gap-2">
                      ✓ <span>Welcome!</span>
                    </span>
                  ) : (
                    'Start Journey'
                  )}
                </motion.button>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Join 5,000+ early supporters • No spam, just updates that matter
              </p>
            </form>
          </div>
        </motion.div>
      </section>

      {/* Professional Features */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Built for Modern Dog Parents
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional-grade tools designed with love, backed by expertise,
              and trusted by the community.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-white text-xl">🏥</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">AI-Powered Health Insights</h3>
                    <p className="text-gray-600">
                      Advanced algorithms analyze your dog's health patterns, providing
                      personalized recommendations and early warning signs.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-white text-xl">👥</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Expert Community Network</h3>
                    <p className="text-gray-600">
                      Connect with veterinarians, trainers, and experienced dog parents
                      who understand your journey and challenges.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-white text-xl">📱</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Seamless Experience</h3>
                    <p className="text-gray-600">
                      Intuitive design that makes complex care simple. Every feature
                      crafted with your daily routine in mind.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-12 text-white shadow-2xl">
                <div className="text-center">
                  <div className="w-24 h-24 bg-white/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                    <span className="text-4xl">📱</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">App Preview Coming Soon</h3>
                  <p className="text-blue-100 mb-6">
                    We're putting the finishing touches on an experience that will
                    transform how you care for your furry friend.
                  </p>
                  <div className="flex justify-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🐕</span>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">❤️</span>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🏆</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust & Social Proof */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Trusted by Dog Parents Everywhere
            </h2>
            <p className="text-lg text-gray-600">
              Our community is growing, and so is the impact we're making together.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8 text-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                5,000+
              </div>
              <p className="text-gray-600 font-medium">Early Supporters</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent mb-2">
                50+
              </div>
              <p className="text-gray-600 font-medium">Cities Waiting</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-2">
                24/7
              </div>
              <p className="text-gray-600 font-medium">Expert Support</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent mb-2">
                2025
              </div>
              <p className="text-gray-600 font-medium">Launch Year</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-blue-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">W</span>
                </div>
                <span className="font-bold text-2xl">Woofadaar</span>
              </div>
              <p className="text-blue-200 max-w-2xl mx-auto">
                Building the future of dog care, one story at a time.
                Because every dog deserves extraordinary care.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex justify-center gap-6 mb-8"
            >
              <span className="text-3xl hover:scale-110 transition-transform cursor-pointer">🐕</span>
              <span className="text-3xl hover:scale-110 transition-transform cursor-pointer">❤️</span>
              <span className="text-3xl hover:scale-110 transition-transform cursor-pointer">🏆</span>
              <span className="text-3xl hover:scale-110 transition-transform cursor-pointer">🐾</span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="text-blue-300 text-sm"
            >
              © 2025 Woofadaar. Every bark counts. Made with love for dogs everywhere.
            </motion.p>
          </div>
        </div>
      </footer>
    </main>
  );
}