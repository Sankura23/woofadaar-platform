// src/app/profile/dogs/add/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import DogForm from '@/components/dogs/DogForm';

export default function AddDogPage() {
  const router = useRouter();

  const handleSave = (success: boolean) => {
    if (success) {
      alert('Dog profile created successfully!');
      router.push('/profile/dogs');
    } else {
      alert('Failed to create dog profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-milk-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <a href="/profile" className="hover:text-primary">Profile</a>
          <span>/</span>
          <a href="/profile/dogs" className="hover:text-primary">Dogs</a>
          <span>/</span>
          <span className="text-gray-900">Add Dog</span>
        </nav>

        <DogForm onSave={handleSave} />
      </div>
    </div>
  );
}