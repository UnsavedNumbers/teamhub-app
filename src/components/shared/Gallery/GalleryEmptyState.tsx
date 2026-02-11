import React from 'react';
import { cn } from '@/utils/cn';

interface GalleryEmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const GalleryEmptyState: React.FC<GalleryEmptyStateProps> = ({ 
  title = "No items found", 
  description = "Try adjusting your filters or search query.",
  action,
  icon,
  className 
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-12 text-center h-64', className)}>
      <div className="text-gray-400 mb-4">
        {icon || (
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-sm">{description}</p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};
