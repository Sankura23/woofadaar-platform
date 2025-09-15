'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import HealthLogForm from '@/components/health/HealthLogForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Dog {
  id: string;
  name: string;
  breed: string;
}

export default function HealthLogPage() {
  const params = useParams();
  const router = useRouter();
  const dogId = params.dogId as string;
  
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDog();
  }, [dogId]);

  const fetchDog = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const response = await fetch(`/api/dogs/${dogId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDog(data.dog);
      }
    } catch (error) {
      console.error('Error fetching dog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    router.push(`/health/${dogId}`);
  };

  const handleCancel = () => {
    router.push(`/health/${dogId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900 mb-2">Dog not found</h2>
          <Link href="/health" className="text-[#3bbca8] hover:text-[#2daa96]">
            Back to Health Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href={`/health/${dogId}`}
            className="inline-flex items-center text-[#3bbca8] hover:text-[#2daa96] mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {dog.name}'s Health
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Daily Health Log</h1>
          <p className="text-gray-600">Record {dog.name}'s daily health information</p>
        </div>

        {/* Health Log Form */}
        <HealthLogForm
          dogId={dogId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}