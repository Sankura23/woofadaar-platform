import PartnerRegistrationForm from '@/components/partners/PartnerRegistrationForm';

export default function PartnerRegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-white to-[#fef8e8]">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Partner with Woofadaar
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Join India&apos;s leading dog parent community as a trusted partner. 
            Connect with thousands of dog parents who need your expertise.
          </p>
        </div>

        <div className="mb-12">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Veterinarians</h3>
              <p className="text-gray-600 text-sm">
                Join our network of verified veterinarians. Access Health IDs, provide consultations, and build your practice.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dog Trainers</h3>
              <p className="text-gray-600 text-sm">
                Share your expertise with dog parents. Offer training services and build lasting relationships with clients.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Corporate Partners</h3>
              <p className="text-gray-600 text-sm">
                Reach engaged dog parent audience. Showcase your products and services to our growing community.
              </p>
            </div>
          </div>
        </div>

        <PartnerRegistrationForm />

        <div className="mt-16 text-center max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Partner with Woofadaar?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl font-bold text-[#3bbca8] mb-2">10,000+</div>
              <div className="text-gray-600">Active Dog Parents</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl font-bold text-[#e05a37] mb-2">50+</div>
              <div className="text-gray-600">Cities Covered</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl font-bold text-[#3bbca8] mb-2">500+</div>
              <div className="text-gray-600">Verified Partners</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl font-bold text-[#e05a37] mb-2">24/7</div>
              <div className="text-gray-600">Platform Access</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}