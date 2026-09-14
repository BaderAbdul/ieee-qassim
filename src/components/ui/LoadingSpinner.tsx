import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  className = '',
  color = 'border-blue-600'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-[2px]',
    md: 'h-8 w-8 border-[3px]',
    lg: 'h-12 w-12 border-4'
  };

  return (
    <div className={`inline-block animate-spin rounded-full ${sizeClasses[size]} border-b-transparent ${color} ${className}`} role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );
}
