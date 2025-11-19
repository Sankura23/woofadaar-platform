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
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validate phone number (10 digits)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      setIsSubmitting(false);
      return;
    }

    // Validate excitement field
    if (!formData.excitement) {
      setError('Please select what you are most excited about');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setIsSubmitting(false);
      setWaitlistPosition(data.position || null);
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
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <>
      {/* Modal Form */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
                    className="text-center py-6 sm:py-10"
                  >
                    <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-primary-mint mx-auto mb-4 sm:mb-6" />
                    <h3 className="text-2xl sm:text-3xl font-bold text-ui-textPrimary mb-3 sm:mb-4">
                      You&apos;re on the List! 🎉
                    </h3>
                    <div className="px-4 sm:px-6 space-y-3 text-left max-w-md mx-auto">
                      <h4 className="font-semibold text-ui-textPrimary text-center mb-3">
                        What happens next?
                      </h4>
                      <div className="flex gap-3">
                        <Sparkles className="w-5 h-5 text-primary-mint flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-ui-textSecondary">
                          We&apos;ll send you early access when we launch
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Sparkles className="w-5 h-5 text-primary-mint flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-ui-textSecondary">
                          Get exclusive updates on features & events
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Sparkles className="w-5 h-5 text-primary-mint flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-ui-textSecondary">
                          Join a community that gets you and your pup
                        </p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-ui-textSecondary mt-6 px-4">
                      Welcome to Woofadaar family, {formData.name.split(' ')[0]}! 🎉
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
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-ui-border focus:border-primary-mint focus:outline-none transition-colors"
                          placeholder="+91 98765 43210"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-sm font-semibold text-ui-textPrimary mb-2">
                          Location *
                        </label>
                        <input
                          type="text"
                          required
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
                          What are you most excited about? *
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
                                required
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
                            Send me weekly dog care tips
                          </span>
                        </label>
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                          {error}
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full btn-primary text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] py-3 sm:py-4"
                      >
                        {isSubmitting ? 'Joining...' : 'Join the Waitlist'}
                      </button>

                      <p className="text-xs sm:text-sm text-ui-textSecondary text-center px-2">
                        By joining, you consent to our{' '}
                        <a href="/privacy" target="_blank" className="text-primary-mint hover:underline font-medium">
                          Privacy Policy
                        </a>{' '}
                        and agree to receive updates about Woofadaar. You can unsubscribe anytime.
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