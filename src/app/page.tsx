import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-milk-white">
      {/* Header */}
      <div className="bg-[#3bbca8] text-white p-4 sm:p-6 lg:p-8 text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">woofadaar</h1>
        <p className="text-base sm:text-lg lg:text-xl">India&apos;s Dog Parent Community</p>
        <div className="mt-4 sm:mt-6">
          <Link
            href="/waitlist"
            className="bg-[#e05a37] text-white px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 rounded-xl hover:bg-opacity-90 transition-colors font-semibold inline-block touch-target shadow-md hover:shadow-lg"
          >
            🎉 Join Our Pre-Launch Waitlist
          </Link>
        </div>
      </div>
      
      {/* Quick Access Buttons - Moved to top */}
      <div className="bg-white border-b border-gray-200 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link
              href="/register"
              className="bg-[#3bbca8] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-opacity-90 transition-colors text-center font-medium touch-target shadow-sm hover:shadow-md"
            >
              <span className="hidden sm:inline">Join Community</span>
              <span className="sm:hidden">Join Community</span>
            </Link>
            <Link
              href="/login"
              className="bg-[#76519f] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-opacity-90 transition-colors text-center font-medium touch-target shadow-sm hover:shadow-md"
            >
              Login
            </Link>
            <Link
              href="/profile"
              className="bg-[#e05a37] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-opacity-90 transition-colors text-center font-medium touch-target shadow-sm hover:shadow-md"
            >
              <span className="hidden sm:inline">Complete Profile</span>
              <span className="sm:hidden">Profile</span>
            </Link>
            <Link
              href="/admin/waitlist"
              className="bg-gray-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-opacity-90 transition-colors text-center font-medium touch-target shadow-sm hover:shadow-md"
            >
              <span className="hidden sm:inline">Admin Dashboard</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Welcome Section */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Welcome to Woofadaar! 🐕</h2>
          <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6">Your trusted community for dog parents across India.</p>
          
          {/* Pre-Launch Notice */}
          <div className="bg-[#ffa602] bg-opacity-20 border border-[#ffa602] rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">🚧 We&apos;re Launching Soon!</h3>
            <p className="text-sm sm:text-base text-gray-700 mb-3">
              Woofadaar is currently in development. Join our waitlist to be the first to access our comprehensive dog parent community platform!
            </p>
            <Link
              href="/waitlist"
              className="bg-[#3bbca8] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl hover:bg-opacity-90 transition-colors inline-block touch-target shadow-sm hover:shadow-md"
            >
              Join Waitlist →
            </Link>
          </div>
        </div>

        {/* Feature Showcase */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">🌟 Key Features</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* KCI Integration */}
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🏆</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">KCI Integration</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                Verify KCI registration numbers and access comprehensive breed information from the official KCI database.
              </p>
              <Link
                href="/kci"
                className="text-[#3bbca8] hover:underline text-xs sm:text-sm font-medium"
              >
                Try KCI Verification →
              </Link>
            </div>

            {/* Partner Directory */}
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🔍</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Find Partners</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                Connect with verified veterinarians, trainers, and corporate partners in your area.
              </p>
              <Link
                href="/partners/directory"
                className="text-[#3bbca8] hover:underline text-xs sm:text-sm font-medium"
              >
                Browse Partners →
              </Link>
            </div>

            {/* Health Tracking */}
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">❤️</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Health Tracking</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                Track vaccinations, health records, and wellness reminders for your furry family members.
              </p>
              <Link
                href="/health"
                className="text-[#3bbca8] hover:underline text-xs sm:text-sm font-medium"
              >
                Start Tracking →
              </Link>
            </div>

            {/* Community */}
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">💬</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Community</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                Join discussions, ask questions, and connect with other dog parents in your area.
              </p>
              <Link
                href="/community"
                className="text-[#3bbca8] hover:underline text-xs sm:text-sm font-medium"
              >
                Join Community →
              </Link>
            </div>

            {/* Dog ID */}
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🏥</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Dog ID</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                Generate and manage unique health IDs for your dogs with QR code access.
              </p>
              <Link
                href="/dog-id"
                className="text-[#3bbca8] hover:underline text-xs sm:text-sm font-medium"
              >
                Create Dog ID →
              </Link>
            </div>

            {/* Appointments */}
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">📅</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Book Appointments</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                Schedule vet visits, grooming sessions, and training appointments with verified partners.
              </p>
              <Link
                href="/appointments"
                className="text-[#3bbca8] hover:underline text-xs sm:text-sm font-medium"
              >
                Book Now →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}