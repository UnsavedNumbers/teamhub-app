import React from 'react';
import { cn } from '@/utils/cn';

interface GalleryLoadingStateProps {
  className?: string;
  itemCount?: number;
}

export const GalleryLoadingState: React.FC<GalleryLoadingStateProps> = ({ 
  className,
  itemCount = 12 
}) => {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4', className)}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <div 
          key={i} 
          className="aspect-square bg-gray-200 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
};
