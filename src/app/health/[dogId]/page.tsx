'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import HealthDashboard from '@/components/health/HealthDashboard';
import Link from 'next/link';
import { ArrowLeft, Dog } from 'lucide-react';

interface DogData {
  id: string;
  name: string;
  breed: string;
}

export default function DogHealthPage() {
  const params = useParams();
  const dogId = params.dogId as string;
  
  const [dog, setDog] = useState<DogData | null>(null);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3bbca8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Dog className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Dog not found</h2>
          <p className="text-gray-500 mb-4">This dog may not exist or you don't have access to it.</p>
          <Link 
            href="/health" 
            className="inline-flex items-center px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Health Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/health"
            className="inline-flex items-center text-[#3bbca8] hover:text-[#2daa96] mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Health Overview
          </Link>
        </div>

        {/* Health Dashboard */}
        <HealthDashboard dogId={dogId} />
      </div>
    </div>
  );
}