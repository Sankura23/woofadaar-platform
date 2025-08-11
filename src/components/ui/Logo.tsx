import Image from 'next/image';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function Logo({ size = 40, className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className="rounded-lg overflow-hidden bg-[#3BBCA8] p-1" 
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 120 120" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <rect width="120" height="120" fill="#FEF8E8" rx="8"/>
          <g transform="translate(10, 10)">
            {/* Main W shape */}
            <path 
              d="M20 65C20 50 35 35 50 35C65 35 80 50 80 65C80 80 65 95 50 95C35 95 20 80 20 65Z" 
              fill="#3BBCA8"
            />
            <path 
              d="M15 45C15 32.5 25 22.5 37.5 22.5C50 22.5 60 32.5 60 45C60 57.5 50 67.5 37.5 67.5C25 67.5 15 57.5 15 45Z" 
              fill="#3BBCA8"
            />
            <path 
              d="M40 45C40 32.5 50 22.5 62.5 22.5C75 22.5 85 32.5 85 45C85 57.5 75 67.5 62.5 67.5C50 67.5 40 57.5 40 45Z" 
              fill="#3BBCA8"
            />
            <path 
              d="M30 25C30 17.5 35 10 42.5 10C50 10 55 17.5 55 25C55 32.5 50 40 42.5 40C35 40 30 32.5 30 25Z" 
              fill="#3BBCA8"
            />
            <path 
              d="M45 25C45 17.5 50 10 57.5 10C65 10 70 17.5 70 25C70 32.5 65 40 57.5 40C50 40 45 32.5 45 25Z" 
              fill="#3BBCA8"
            />
          </g>
        </svg>
      </div>
      {showText && (
        <span className="font-bold text-xl text-primary">
          woofadaar
        </span>
      )}
    </div>
  );
}