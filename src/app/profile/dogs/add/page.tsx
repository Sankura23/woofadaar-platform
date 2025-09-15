// src/app/profile/dogs/add/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import DogProfileForm from '@/components/profiles/DogProfileForm';

export default function AddDogPage() {
  const router = useRouter();

  const handleSave = (success: boolean) => {
    if (success) {
      // Add a longer delay to ensure the API has fully processed the dog creation
      setTimeout(() => {
        // Use replace to avoid back button issues and add timestamp to force refresh
        router.replace(`/profile/dogs?refresh=${Date.now()}&added=true`);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <a href="/profile" className="hover:text-primary transition-colors">Profile</a>
          <span>/</span>
          <a href="/profile/dogs" className="hover:text-primary transition-colors">Dogs</a>
          <span>/</span>
          <span className="text-gray-900">Add Dog</span>
        </nav>

        <DogProfileForm onSave={handleSave} />
      </div>
    </div>
  );
}