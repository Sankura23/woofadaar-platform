'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle } from 'lucide-react';

interface JoinWaitlistProps {
  isOpen: boolean;
  onClose: () => void;
}

const excitementOptions = [
  'Health Tracking & AI Insights',
  'Community & Social Features',
  'Vet Connect & Services',
  'Training & Behavior Tips',
  'Emergency Support',
  'All of the Above!',
];

export default function JoinWaitlist({ isOpen, onClose }: JoinWaitlistProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    dogName: '',
    dogBreed: '',
    dogAge: '',
    excitement: '',
    weeklyTips: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);

      // Reset after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setFormData({
          name: '',
          email: '',
          phone: '',
          location: '',
          dogName: '',
          dogBreed: '',
          dogAge: '',
          excitement: '',
          weeklyTips: false,
        });
      }, 3000);
    }, 2000);
  };

  return (
    <>
      {/* Modal Form */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-ui-textSecondary hover:text-ui-textPrimary transition-colors z-10"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Content */}
              <div className="p-6 sm:p-8">
                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8 sm:py-12"
                  >
                    <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-primary-mint mx-auto mb-4 sm:mb-6" />
                    <h3 className="text-2xl sm:text-3xl font-bold text-ui-textPrimary mb-3 sm:mb-4">
                      You&apos;re on the List! 🎉
                    </h3>
                    <p className="text-sm sm:text-base text-ui-textSecondary px-2">
                      Welcome to the Woofadaar family! Check your email for confirmation.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <div className="text-center mb-6 sm:mb-8">
                      <h3 className="text-2xl sm:text-3xl font-bold text-ui-textPrimary mb-2">
                        Join the Waitlist
                      </h3>
                      <p className="text-sm sm:text-base text-ui-textSecondary">
                        Be among the first to experience Woofadaar
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-semibold text-ui-textPrimary mb-2">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-ui-border focus:border-primary-mint focus:outline-none transition-colors"
                          placeholder="John Doe"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-semibold text-ui-textPrimary mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-ui-border focus:border-primary-mint focus:outline-none transition-colors"
                          placeholder="your@email.com"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-semibold text-ui-textPrimary mb-2">
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-ui-border focus:border-primary-mint focus:outline-none transition-colors"
                          placeholder="+91 98765 43210"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-sm font-semibold text-ui-textPrimary mb-2">
                          Location
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-ui-border focus:border-primary-mint focus:outline-none transition-colors"
                          placeholder="City, Country"
                        />
                      </div>

                      {/* Dog Name */}
                      <div>
                        <label className="block text-sm font-semibold text-ui-textPrimary mb-2">
                          Dog's Name
                        </label>
                        <input
                          type="text"
                          value={formData.dogName}
                          onChange={(e) => setFormData({ ...formData, dogName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-ui-border focus:border-primary-mint focus:outline-none transition-colors"
                          placeholder="Buddy"
                        />
                      </div>

                      {/* Dog Breed */}
                      <div>
                        <label className="block text-sm font-semibold text-ui-textPrimary mb-2">
                          Dog's Breed
                        </label>
                        <input
                          type="text"
                          value={formData.dogBreed}
                          onChange={(e) => setFormData({ ...formData, dogBreed: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-ui-border focus:border-primary-mint focus:outline-none transition-colors"
                          placeholder="Golden Retriever"
                        />
                      </div>

                      {/* Dog Age */}
                      <div>
                        <label className="block text-sm font-semibold text-ui-textPrimary mb-2">
                          Dog's Age
                        </label>
                        <select
                          value={formData.dogAge}
                          onChange={(e) => setFormData({ ...formData, dogAge: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-ui-border focus:border-primary-mint focus:outline-none transition-colors"
                        >
                          <option value="">Select age range</option>
                          <option value="puppy">Puppy (0-1 year)</option>
                          <option value="young">Young (1-3 years)</option>
                          <option value="adult">Adult (3-7 years)</option>
                          <option value="senior">Senior (7+ years)</option>
                        </select>
                      </div>

                      {/* What are you most excited about? */}
                      <div>
                        <label className="block text-sm font-semibold text-ui-textPrimary mb-2">
                          What are you most excited about?
                        </label>
                        <div className="space-y-2">
                          {excitementOptions.map((option) => (
                            <label
                              key={option}
                              className="flex items-center gap-3 p-3 rounded-xl border-2 border-ui-border hover:border-primary-mint cursor-pointer transition-colors"
                            >
                              <input
                                type="radio"
                                name="excitement"
                                value={option}
                                checked={formData.excitement === option}
                                onChange={(e) => setFormData({ ...formData, excitement: e.target.value })}
                                className="w-5 h-5 text-primary-mint"
                              />
                              <span className="text-sm text-ui-textPrimary">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Weekly Tips */}
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.weeklyTips}
                            onChange={(e) => setFormData({ ...formData, weeklyTips: e.target.checked })}
                            className="w-5 h-5 text-primary-mint rounded"
                          />
                          <span className="text-sm text-ui-textPrimary">
                            Send me weekly dog care tips & updates
                          </span>
                        </label>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full btn-primary text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] py-3 sm:py-4"
                      >
                        {isSubmitting ? 'Joining...' : 'Join the Waitlist'}
                      </button>

                      <p className="text-xs sm:text-sm text-ui-textSecondary text-center px-2">
                        By joining, you agree to receive updates about Woofadaar.
                        We respect your privacy and won&apos;t spam.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}