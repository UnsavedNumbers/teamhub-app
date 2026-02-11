import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholder?: React.ReactNode;
}

export const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  className, 
  placeholder,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Load slightly before entering viewport
    );
    
    if (imgRef.current) observer.observe(imgRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return (
    <div ref={imgRef} className={cn('relative overflow-hidden bg-gray-100', className)}>
      {isInView ? (
        <>
          <img
            src={src}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            {...props}
          />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              {placeholder || (
                 <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full" />
      )}
    </div>
  );
};
