'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Tablet, Monitor, X } from 'lucide-react';

type ViewMode = 'mobile' | 'tablet' | 'desktop';

interface ViewConfig {
  mode: ViewMode;
  width: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

const viewConfigs: ViewConfig[] = [
  {
    mode: 'mobile',
    width: '375px',
    icon: Smartphone,
    label: 'Mobile',
    description: 'iPhone 12/13 (375px)'
  },
  {
    mode: 'tablet',
    width: '768px', 
    icon: Tablet,
    label: 'Tablet',
    description: 'iPad (768px)'
  },
  {
    mode: 'desktop',
    width: '100%',
    icon: Monitor,
    label: 'Desktop',
    description: 'Full width'
  }
];

export default function ResponsiveViewToggle() {
  const [currentView, setCurrentView] = useState<ViewMode>('desktop');
  const [isVisible, setIsVisible] = useState(true);
  const [isDevelopment, setIsDevelopment] = useState(false);

  useEffect(() => {
    // Only show in development mode
    setIsDevelopment(process.env.NODE_ENV === 'development');
  }, []);

  useEffect(() => {
    // Apply the viewport width change
    const body = document.body;
    const container = document.getElementById('responsive-container');
    
    if (currentView === 'desktop') {
      body.style.width = '100%';
      body.style.margin = '0 auto';
      body.style.border = 'none';
      body.style.boxShadow = 'none';
    } else {
      const config = viewConfigs.find(v => v.mode === currentView);
      if (config) {
        body.style.width = config.width;
        body.style.margin = '0 auto';
        body.style.border = '1px solid #e5e7eb';
        body.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }
    }
  }, [currentView]);

  // Don't render in production
  if (!isDevelopment || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg">
      <div className="p-2 sm:p-3">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-xs font-medium text-gray-700 hidden sm:inline">Responsive Test</span>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Hide responsive toggle"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        
        <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
          {viewConfigs.map((config) => {
            const Icon = config.icon;
            return (
              <button
                key={config.mode}
                onClick={() => setCurrentView(config.mode)}
                className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded text-xs font-medium transition-all duration-200 ${
                  currentView === config.mode
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title={config.description}
              >
                <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            );
          })}
        </div>

        <div className="mt-2 text-center hidden sm:block">
          <span className="text-xs text-gray-500">
            {viewConfigs.find(v => v.mode === currentView)?.description}
          </span>
        </div>
      </div>
    </div>
  );
}

// Utility component wrapper (no longer needs padding since toggle is in corner)
export function ResponsiveWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20 md:pb-0" id="responsive-container">
      {children}
    </div>
  );
}