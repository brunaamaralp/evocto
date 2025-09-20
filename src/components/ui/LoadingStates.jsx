
import React from 'react';
import { Typography, Button } from '@/components/ui/design-system';

export const Spinner = ({ 
  size = 'base', 
  text = '', 
  className = '' 
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    base: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`
        animate-spin rounded-full border-2 border-secondary-200 border-t-primary-500
        ${sizes[size]}
      `}></div>
      {text && (
        <Typography variant="body2" className="text-secondary-600">
          {text}
        </Typography>
      )}
    </div>
  );
};

export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-white rounded-xl p-6 border border-secondary-200 ${className}`}>
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 bg-secondary-200 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-4 bg-secondary-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-secondary-100 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-secondary-200 rounded w-full"></div>
        <div className="h-3 bg-secondary-200 rounded w-5/6"></div>
        <div className="h-3 bg-secondary-200 rounded w-4/6"></div>
      </div>
    </div>
  </div>
);

export const SkeletonLine = ({ width = 'full', className = '' }) => {
  const widths = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  };
  return (
    <div className={`h-3 bg-secondary-200 rounded animate-pulse ${widths[width]} ${className}`}></div>
  );
};

export const SkeletonList = ({ count = 3, itemClassName = '', gap = 2, width = 'full' }) => (
  <div className={`space-y-${gap}`}>
    {Array(count).fill(0).map((_, i) => (
      <SkeletonLine key={i} className={itemClassName} width={width} />
    ))}
  </div>
);

export const LoadingOverlay = ({ 
  show = false, 
  text = 'Carregando...', 
  className = '' 
}) => {
  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-70 ${className}`}>
      <div className="text-center">
        <Spinner size="xl" text={text} />
      </div>
    </div>
  );
};

export const LoadingButton = ({ 
  children, 
  isLoading, 
  loadingText = 'Carregando...', 
  spinnerSize = 'sm', 
  ...props 
}) => {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <Spinner size={spinnerSize} />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
};

const LoadingStates = {};
export default LoadingStates;
