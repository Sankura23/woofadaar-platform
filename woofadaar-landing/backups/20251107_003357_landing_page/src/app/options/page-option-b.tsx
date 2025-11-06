'use client';

import { useState } from 'react';

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
    <main className="min-h-screen bg-white">
      {/* Option B: Minimalist/Clean - Inspired by Apple & Linear */}

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-lg">Woofadaar</span>
          </div>
          <button className="text-sm font-medium bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            Get Early Access
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Coming Q1 2025
          </div>

          {/* Main Headline */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 tracking-tight mb-6">
            Dog care.
            <br />
            <span className="text-gray-400">Simplified.</span>
          </h1>

          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            One app for everything your dog needs. Health tracking, vet connections,
            and a community that gets it.
          </p>

          {/* Email Signup */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                {isSubmitted ? '✓' : 'Join'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Join 5,000+ early supporters. No spam, ever.
            </p>
          </form>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="text-4xl mb-4">🏥</div>
              <h3 className="text-lg font-semibold mb-2">Health First</h3>
              <p className="text-gray-600 text-sm">
                AI-powered health tracking with insights that matter.
              </p>
            </div>
            <div>
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">Real Community</h3>
              <p className="text-gray-600 text-sm">
                Connect with pet parents who understand the journey.
              </p>
            </div>
            <div>
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold mb-2">Always There</h3>
              <p className="text-gray-600 text-sm">
                24/7 support when you need guidance the most.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-16">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-black rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">W</span>
                </div>
                <p className="text-gray-600">App Preview Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold">5K+</p>
              <p className="text-gray-600 text-sm mt-1">Early Supporters</p>
            </div>
            <div>
              <p className="text-4xl font-bold">100%</p>
              <p className="text-gray-600 text-sm mt-1">Privacy First</p>
            </div>
            <div>
              <p className="text-4xl font-bold">24/7</p>
              <p className="text-gray-600 text-sm mt-1">Support Ready</p>
            </div>
            <div>
              <p className="text-4xl font-bold">2025</p>
              <p className="text-gray-600 text-sm mt-1">Launch Year</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">W</span>
            </div>
            <span className="text-sm text-gray-600">© 2025 Woofadaar. Every bark counts.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-gray-600 hover:text-black transition-colors">Twitter</a>
            <a href="#" className="text-sm text-gray-600 hover:text-black transition-colors">Instagram</a>
            <a href="#" className="text-sm text-gray-600 hover:text-black transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}