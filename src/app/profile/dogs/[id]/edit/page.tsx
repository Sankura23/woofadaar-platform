// src/app/profile/dogs/[id]/edit/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import DogProfileForm from '@/components/profiles/DogProfileForm';

export default function EditDogPage() {
  const router = useRouter();
  const params = useParams();
  const dogId = params.id as string;

  const handleSave = (success: boolean) => {
    if (success) {
      router.push('/profile/dogs');
    }
  };

  return (
    <div className="min-h-screen bg-milk-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <a href="/profile" className="hover:text-primary transition-colors">Profile</a>
          <span>/</span>
          <a href="/profile/dogs" className="hover:text-primary transition-colors">Dogs</a>
          <span>/</span>
          <span className="text-gray-900">Edit Dog</span>
        </nav>

        <DogProfileForm dogId={dogId} onSave={handleSave} />
      </div>
    </div>
  );
} 