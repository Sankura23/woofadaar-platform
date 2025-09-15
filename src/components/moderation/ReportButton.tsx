'use client';

import { useState } from 'react';
import ReportModal from './ReportModal';

interface ReportButtonProps {
  contentType: 'question' | 'answer' | 'comment' | 'forum_post' | 'story';
  contentId: string;
  className?: string;
  variant?: 'button' | 'icon' | 'link';
  size?: 'sm' | 'md' | 'lg';
}

export default function ReportButton({ 
  contentType, 
  contentId, 
  className = '',
  variant = 'icon',
  size = 'sm'
}: ReportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const baseClasses = `
    inline-flex items-center justify-center rounded-md transition-colors duration-200
    text-gray-500 hover:text-red-600 hover:bg-red-50
    focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
  `;

  const variantClasses = {
    button: `${baseClasses} ${sizeClasses[size]} border border-gray-300 bg-white hover:border-red-300`,
    icon: `${baseClasses} p-2 hover:bg-gray-100`,
    link: `${baseClasses} ${sizeClasses[size]} hover:bg-transparent hover:underline`
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`${variantClasses[variant]} ${className}`}
        title="Report this content"
        aria-label="Report inappropriate content"
      >
        {variant === 'icon' ? (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        ) : variant === 'button' ? (
          <>
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            Report
          </>
        ) : (
          'Report'
        )}
      </button>

      <ReportModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        contentType={contentType}
        contentId={contentId}
      />
    </>
  );
}