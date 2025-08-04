import WaitlistForm from '@/components/waitlist/WaitlistForm';

export default function WaitlistPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-white to-[#fef8e8]">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Woofadaar
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-2">
            India&apos;s First Comprehensive Dog Parent Community
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect, learn, and grow with fellow dog parents across India. 
            From first-time puppy parents to experienced dog lovers - we&apos;re building something special.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div>
            <WaitlistForm />
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">What&apos;s Coming Soon?</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#3bbca8] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Expert Q&A Community</h4>
                    <p className="text-gray-600 text-sm">Get answers from veterinarians and experienced dog parents</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#e05a37] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Dog Health Tracking</h4>
                    <p className="text-gray-600 text-sm">Monitor your dog&apos;s health, vaccinations, and milestones</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#3bbca8] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Local Communities</h4>
                    <p className="text-gray-600 text-sm">Connect with dog parents in your city</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#e05a37] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Training Resources</h4>
                    <p className="text-gray-600 text-sm">Access to training guides and expert tips</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#3bbca8] rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Multilingual Support</h4>
                    <p className="text-gray-600 text-sm">Available in Hindi and English</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#e05a37] to-[#d14d2a] rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-3">Early Bird Benefits</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Free premium features for first 6 months
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Exclusive access to expert sessions
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Priority support and feature requests
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Special founder member badge
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Woofadaar?</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#3bbca8] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#3bbca8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Made for India</h4>
                <p className="text-gray-600 text-sm">Understanding Indian dog parenting challenges and solutions</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-[#e05a37] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#e05a37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Expert Guidance</h4>
                <p className="text-gray-600 text-sm">Verified veterinarians and certified trainers</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-[#3bbca8] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#3bbca8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Community First</h4>
                <p className="text-gray-600 text-sm">Connect with like-minded dog parents who truly understand</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}