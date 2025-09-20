import React from 'react';

export const ResponsiveGrid = ({ 
  children, 
  cols = { base: 1, md: 2, lg: 3 },
  gap = 6,
  className = ''
}) => {
  const colsClass = `grid-cols-${cols.base} md:grid-cols-${cols.md} lg:grid-cols-${cols.lg}`;
  const gapClass = `gap-${gap}`;
  
  return (
    <div className={`grid ${colsClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
};

export const ResponsiveStack = ({ 
  children, 
  direction = { base: 'col', lg: 'row' },
  gap = 4,
  className = ''
}) => {
  const directionClass = `flex-${direction.base} lg:flex-${direction.lg}`;
  const gapClass = `gap-${gap}`;
  
  return (
    <div className={`flex ${directionClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
};

export const Container = ({ 
  children, 
  size = 'default',
  padding = true,
  className = ''
}) => {
  const sizes = {
    sm: 'max-w-4xl',
    default: 'max-w-7xl',
    lg: 'max-w-full',
    full: 'w-full'
  };
  
  const paddingClass = padding ? 'px-4 sm:px-6 lg:px-8' : '';
  
  return (
    <div className={`mx-auto ${sizes[size]} ${paddingClass} ${className}`}>
      {children}
    </div>
  );
};