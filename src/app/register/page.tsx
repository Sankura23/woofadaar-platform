import RegisterForm from '@/components/profiles/auth/RegisterForm';
export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-milk-white py-12">
      <div className="container mx-auto px-4">
        {/* Home button in top right */}
        <div className="flex justify-end mb-4">
          <a
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </a>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">woofadaar</h1>
          <p className="text-dark-grey">Join India's largest dog parent community</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}