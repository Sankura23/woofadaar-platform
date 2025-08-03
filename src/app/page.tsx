import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-milk-white">
      {/* Header */}
      <div className="bg-primary text-white p-8 text-center">
        <h1 className="text-4xl font-bold mb-2">woofadaar</h1>
        <p className="text-xl">India's Dog Parent Community</p>
      </div>
      
      {/* Content */}
      <div className="p-8 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-dark-grey mb-4">Welcome to Woofadaar! 🐕</h2>
          <p className="text-dark-grey mb-6">Your trusted community for dog parents across India.</p>
          
          {/* Auth Buttons */}
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
          </div>
          
          {/* Color Demo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary text-white p-4 rounded text-center">Primary (Mint Teal)</div>
            <div className="bg-secondary text-white p-4 rounded text-center">Secondary (Purple)</div>
            <div className="bg-burnt-orange text-white p-4 rounded text-center">Burnt Orange</div>
            <div className="bg-warm-yellow text-dark-grey p-4 rounded text-center">Warm Yellow</div>
          </div>
        </div>
      </div>
    </div>
  )
}