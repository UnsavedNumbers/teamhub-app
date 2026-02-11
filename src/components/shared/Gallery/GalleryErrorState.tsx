import React from 'react';
import { cn } from '@/utils/cn';

interface GalleryErrorStateProps {
  error: Error;
  onRetry?: () => void;
  className?: string;
}

export const GalleryErrorState: React.FC<GalleryErrorStateProps> = ({ 
  error, 
  onRetry,
  className 
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-12 text-center text-red-600 bg-red-50 rounded-lg m-4', className)}>
      <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
      <p className="mb-6 max-w-sm text-red-800">{error.message || "Failed to load gallery items."}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};
