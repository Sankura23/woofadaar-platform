'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');

  useEffect(() => {
    if (!id) {
      setStatus('invalid');
      return;
    }

    const unsubscribe = async () => {
      try {
        const response = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        if (response.ok) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    };

    unsubscribe();
  }, [id]);

  return (
    <div className="min-h-screen bg-bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-primary-mint border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-ui-textPrimary mb-2">
              Processing...
            </h1>
            <p className="text-ui-textSecondary">
              Please wait while we process your request.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ui-textPrimary mb-2">
              Unsubscribed Successfully
            </h1>
            <p className="text-ui-textSecondary mb-6">
              You have been removed from our mailing list. We&apos;re sorry to see you go!
            </p>
            <Link
              href="/"
              className="inline-block btn-primary px-6 py-3"
            >
              Back to Home
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ui-textPrimary mb-2">
              Something Went Wrong
            </h1>
            <p className="text-ui-textSecondary mb-6">
              We couldn&apos;t process your unsubscribe request. Please try again or contact us.
            </p>
            <Link
              href="/"
              className="inline-block btn-primary px-6 py-3"
            >
              Back to Home
            </Link>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ui-textPrimary mb-2">
              Invalid Link
            </h1>
            <p className="text-ui-textSecondary mb-6">
              This unsubscribe link appears to be invalid or expired.
            </p>
            <Link
              href="/"
              className="inline-block btn-primary px-6 py-3"
            >
              Back to Home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 border-4 border-primary-mint border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-ui-textPrimary mb-2">
            Loading...
          </h1>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
