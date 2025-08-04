import HealthIdVerification from '@/components/partners/HealthIdVerification';

export default function VerifyHealthIdPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-white to-[#fef8e8] py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Health ID Verification Portal
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            For verified partners only. Access dog medical information using Health ID for consultations, treatments, and training sessions.
          </p>
        </div>

        <HealthIdVerification />

        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Important Guidelines</h3>
            <ul className="text-blue-800 space-y-2 text-sm">
              <li>• Only use Health ID verification for legitimate professional purposes</li>
              <li>• All verifications are logged and monitored for security</li>
              <li>• Respect client privacy and confidentiality at all times</li>
              <li>• Contact support if you experience any technical issues</li>
              <li>• Misuse of Health ID access may result in suspension of partner privileges</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}