import React from 'react';

const Logo = ({ size = 'large', className = '' }) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg`}>
        <svg
          className="h-3/4 w-3/4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
          {/* Additional decorative elements */}
          <circle cx="19" cy="5" r="1.5" fill="currentColor" opacity="0.6" />
          <circle cx="5" cy="19" r="1.5" fill="currentColor" opacity="0.6" />
        </svg>
      </div>

      {/* Logo Text */}
      <div className="flex flex-col">
        <span className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent`}>
          LeadFlow
        </span>
        <span className="text-xs text-secondary-500 font-medium tracking-wide">
          PRO
        </span>
      </div>
    </div>
  );
};

export default Logo;
