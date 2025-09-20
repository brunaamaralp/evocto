import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

export default function LoadingState({ 
  message = "Carregando...", 
  variant = "spinner",
  size = "default",
  className = ""
}) {
  if (variant === "skeleton") {
    return <SkeletonLoader size={size} className={className} />;
  }

  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        <Loader2 className={`${sizeClasses[size]} animate-spin mx-auto mb-3 text-blue-600`} />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
}

function SkeletonLoader({ size, className }) {
  if (size === "page") {
    return (
      <div className={`space-y-6 p-6 ${className}`}>
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded-md w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded-md w-2/3 animate-pulse"></div>
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (size === "card") {
    return (
      <div className={`bg-white rounded-lg border p-4 space-y-3 ${className}`}>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  // Default table skeleton
  return (
    <div className={`space-y-4 ${className}`}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}