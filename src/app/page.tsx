import Link from 'next/link'
import WaitlistStats from '@/components/waitlist/WaitlistStats'

export default function Home() {
  return (
    <div className="min-h-screen bg-milk-white">
      {/* Header */}
      <div className="bg-primary text-white p-8 text-center">
        <h1 className="text-4xl font-bold mb-2">woofadaar</h1>
        <p className="text-xl">India&apos;s Dog Parent Community</p>
        <div className="mt-6">
          <Link
            href="/waitlist"
            className="bg-burnt-orange text-white px-8 py-3 rounded-lg hover:bg-opacity-90 transition-colors font-semibold inline-block"
          >
            🎉 Join Our Pre-Launch Waitlist
          </Link>
        </div>
      </div>
      
      {/* Waitlist Stats Section - Temporarily disabled for stability */}
      {/* <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <WaitlistStats />
        </div>
      </div> */}
      
      {/* Content */}
      <div className="p-8 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-dark-grey mb-4">Welcome to Woofadaar! 🐕</h2>
          <p className="text-dark-grey mb-6">Your trusted community for dog parents across India.</p>
          
          {/* Pre-Launch Notice */}
          <div className="bg-warm-yellow bg-opacity-20 border border-warm-yellow rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-dark-grey mb-2">🚧 We&apos;re Launching Soon!</h3>
            <p className="text-dark-grey mb-3">
              Woofadaar is currently in development. Join our waitlist to be the first to access our comprehensive dog parent community platform!
            </p>
            <Link
              href="/waitlist"
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors inline-block"
            >
              Join Waitlist →
            </Link>
          </div>
          
          {/* Auth Buttons for Testing */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-dark-grey mb-4">Developer Access (For Testing)</h3>
            <div className="flex gap-4 mb-6">
              <Link
                href="/register"
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Join Community
              </Link>
              <Link
                href="/login"
                className="bg-secondary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/profile"
                className="bg-burnt-orange text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Complete Profile
              </Link>
              <Link
                href="/admin/waitlist"
                className="bg-dark-grey text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Admin Dashboard
              </Link>
              <Link
                href="/partners/directory"
                className="bg-secondary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Find Partners
              </Link>
            </div>
          </div>
          
          {/* Color Demo */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-dark-grey mb-4">Brand Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary text-white p-4 rounded text-center">Primary (Mint Teal)</div>
              <div className="bg-secondary text-white p-4 rounded text-center">Secondary (Purple)</div>
              <div className="bg-burnt-orange text-white p-4 rounded text-center">Burnt Orange</div>
              <div className="bg-warm-yellow text-dark-grey p-4 rounded text-center">Warm Yellow</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}