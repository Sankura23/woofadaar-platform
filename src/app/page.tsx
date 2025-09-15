import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-[#FAFAFA] text-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 text-center">
        <div className="flex justify-center mb-4">
          {/* Logo image */}
          <Image
            src="/Woofadaar Final Logo-06.png"
            alt="Woofadaar Logo"
            width={400}
            height={120}
            className="w-64 sm:w-80 lg:w-96 h-auto"
            priority
          />
        </div>
        <p className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-700">India&apos;s Dog Parent Community</p>
        <div className="mt-8 sm:mt-10">
          <Link
            href="/waitlist"
            className="bg-[#e05a37] text-white px-8 py-4 rounded-xl hover:bg-[#d04e2a] transition-all duration-200 font-semibold inline-block touch-target shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
          >
            🎉 Join Our Pre-Launch Waitlist
          </Link>
        </div>
      </div>
      
      {/* Quick Access Buttons */}
      <div className="bg-white border-b border-[#e5e5e5] py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Link
              href="/register"
              className="bg-[#3bbca8] text-white px-6 py-4 rounded-xl hover:bg-[#339990] transition-all duration-200 text-center font-semibold touch-target shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Join Community
            </Link>
            <Link
              href="/login"
              className="bg-[#76519f] text-white px-6 py-4 rounded-xl hover:bg-[#614180] transition-all duration-200 text-center font-semibold touch-target shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Login
            </Link>
            <Link
              href="/profile"
              className="bg-[#e05a37] text-white px-6 py-4 rounded-xl hover:bg-[#d04e2a] transition-all duration-200 text-center font-semibold touch-target shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <span className="hidden sm:inline">Complete Profile</span>
              <span className="sm:hidden">Profile</span>
            </Link>
            <Link
              href="/admin/waitlist"
              className="bg-[#525252] text-white px-6 py-4 rounded-xl hover:bg-[#404040] transition-all duration-200 text-center font-semibold touch-target shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <span className="hidden sm:inline">Admin Dashboard</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 space-y-12 sm:space-y-16">
        {/* Welcome Section */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-lg border border-[#f5f5f5] max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#171717] mb-6">Welcome to Woofadaar! 🐕</h2>
          <p className="text-lg sm:text-xl text-[#525252] mb-8 leading-relaxed">Your trusted community for dog parents across India.</p>
          
          {/* Pre-Launch Notice */}
          <div className="bg-[#ffa602] bg-opacity-10 border-2 border-[#ffa602] rounded-2xl p-6 sm:p-8 mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-[#171717] mb-4">🚧 We&apos;re Launching Soon!</h3>
            <p className="text-base sm:text-lg text-[#525252] mb-6 leading-relaxed">
              Woofadaar is currently in development. Join our waitlist to be the first to access our comprehensive dog parent community platform!
            </p>
            <Link
              href="/waitlist"
              className="bg-[#3bbca8] text-white px-6 py-3 rounded-xl hover:bg-[#339990] transition-all duration-200 inline-block touch-target shadow-md hover:shadow-lg font-semibold"
            >
              Join Waitlist →
            </Link>
          </div>
        </div>

        {/* Feature Showcase */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-lg border border-[#f5f5f5] max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#171717] mb-8 sm:mb-12 text-center">🌟 Key Features</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* KCI Integration */}
            <div className="border-2 border-[#e5e5e5] rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-[#3bbca8] hover:scale-105">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-[#171717] mb-3">KCI Integration</h3>
              <p className="text-base text-[#525252] mb-4 leading-relaxed">
                Verify KCI registration numbers and access comprehensive breed information from the official KCI database.
              </p>
              <Link
                href="/kci"
                className="text-[#3bbca8] hover:text-[#339990] font-semibold text-base transition-colors"
              >
                Try KCI Verification →
              </Link>
            </div>

            {/* Partner Directory */}
            <div className="border-2 border-[#e5e5e5] rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-[#3bbca8] hover:scale-105">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-[#171717] mb-3">Find Partners</h3>
              <p className="text-base text-[#525252] mb-4 leading-relaxed">
                Connect with verified veterinarians, trainers, and corporate partners in your area.
              </p>
              <Link
                href="/partners/directory"
                className="text-[#3bbca8] hover:text-[#339990] font-semibold text-base transition-colors"
              >
                Browse Partners →
              </Link>
            </div>

            {/* Health Tracking */}
            <div className="border-2 border-[#e5e5e5] rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-[#3bbca8] hover:scale-105">
              <div className="text-4xl mb-4">❤️</div>
              <h3 className="text-xl font-bold text-[#171717] mb-3">Health Tracking</h3>
              <p className="text-base text-[#525252] mb-4 leading-relaxed">
                Track vaccinations, health records, and wellness reminders for your furry family members.
              </p>
              <Link
                href="/health"
                className="text-[#3bbca8] hover:text-[#339990] font-semibold text-base transition-colors"
              >
                Start Tracking →
              </Link>
            </div>

            {/* Community */}
            <div className="border-2 border-[#e5e5e5] rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-[#3bbca8] hover:scale-105">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-[#171717] mb-3">Community</h3>
              <p className="text-base text-[#525252] mb-4 leading-relaxed">
                Join discussions, ask questions, and connect with other dog parents in your area.
              </p>
              <Link
                href="/community"
                className="text-[#3bbca8] hover:text-[#339990] font-semibold text-base transition-colors"
              >
                Join Community →
              </Link>
            </div>

            {/* Dog ID */}
            <div className="border-2 border-[#e5e5e5] rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-[#3bbca8] hover:scale-105">
              <div className="text-4xl mb-4">🏥</div>
              <h3 className="text-xl font-bold text-[#171717] mb-3">Dog ID</h3>
              <p className="text-base text-[#525252] mb-4 leading-relaxed">
                Generate and manage unique health IDs for your dogs with QR code access.
              </p>
              <Link
                href="/dog-id"
                className="text-[#3bbca8] hover:text-[#339990] font-semibold text-base transition-colors"
              >
                Create Dog ID →
              </Link>
            </div>

            {/* Appointments */}
            <div className="border-2 border-[#e5e5e5] rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-[#3bbca8] hover:scale-105">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-bold text-[#171717] mb-3">Book Appointments</h3>
              <p className="text-base text-[#525252] mb-4 leading-relaxed">
                Schedule vet visits, grooming sessions, and training appointments with verified partners.
              </p>
              <Link
                href="/appointments"
                className="text-[#3bbca8] hover:text-[#339990] font-semibold text-base transition-colors"
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