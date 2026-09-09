import React from 'react';

// Design Tokens
export const designTokens = {
  colors: {
    primary: {
      50: '#F5F2FC',
      100: '#EDE9FB',
      200: '#D4CBF5',
      300: '#AFA9EC',
      400: '#8B7AE0',
      500: '#6C47D8', // Brand purple
      600: '#5A3BC0',
      700: '#4A2FA3',
      800: '#3A2480',
      900: '#2A1A5C'
    },
    secondary: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A'
    },
    success: {
      50: '#F0FDF4',
      500: '#22C55E',
      600: '#16A34A'
    },
    warning: {
      50: '#FFFBEB',
      500: '#F59E0B',
      600: '#D97706'
    },
    error: {
      50: '#FEF2F2',
      500: '#EF4444',
      600: '#DC2626'
    }
  },
  typography: {
    fonts: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Monaco', 'monospace']
    },
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem'   // 36px
    }
  },
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem'      // 96px
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  borderRadius: {
    sm: '0.375rem',
    base: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    '2xl': '1.25rem',
    panel: '1.5rem',
    full: '9999px'
  },
  softShadows: {
    card: '0 4px 16px rgba(24, 22, 42, 0.05), 0 1px 3px rgba(24, 22, 42, 0.04)',
    panel: '0 8px 32px rgba(24, 22, 42, 0.06), 0 2px 8px rgba(24, 22, 42, 0.04)',
    elevated: '0 12px 40px rgba(24, 22, 42, 0.1)'
  }
};

// Core Components

export const Card = ({ children, className = '', variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-white shadow-[var(--shadow-card)] border border-[#E8E5F5]/60',
    elevated: 'bg-white shadow-[var(--shadow-elevated)] border border-[#E8E5F5]/40',
    outlined: 'bg-white border-2 border-[#D4CBF5]',
    ghost: 'bg-[#F5F2FC] border border-[#EDE9FB]'
  };
  
  return (
    <div 
      className={`rounded-2xl p-6 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const Typography = ({ 
  as: Component = 'p', 
  variant = 'body1', 
  children, 
  className = '',
  ...props 
}) => {
  const variants = {
    h1: 'text-4xl font-bold text-secondary-900',
    h2: 'text-3xl font-bold text-secondary-900',
    h3: 'text-2xl font-semibold text-secondary-800',
    h4: 'text-xl font-semibold text-secondary-800',
    h5: 'text-lg font-medium text-secondary-700',
    body1: 'text-base text-secondary-700',
    body2: 'text-sm text-secondary-600',
    caption: 'text-xs text-secondary-500',
    overline: 'text-xs uppercase tracking-wider font-medium text-secondary-500'
  };
  
  return (
    <Component className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </Component>
  );
};

export const StatusBadge = ({ status, children, size = 'base' }) => {
  const statusStyles = {
    success: 'bg-success-50 text-success-600 border-success-200',
    warning: 'bg-warning-50 text-warning-600 border-warning-200',
    error: 'bg-error-50 text-error-600 border-error-200',
    info: 'bg-primary-50 text-primary-600 border-primary-200',
    neutral: 'bg-secondary-100 text-secondary-600 border-secondary-200'
  };
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    base: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  return (
    <span className={`
      inline-flex items-center rounded-full border font-medium
      ${statusStyles[status]} ${sizes[size]}
    `}>
      {children}
    </span>
  );
};

export const IconButton = ({ 
  icon: Icon, 
  variant = 'ghost', 
  size = 'base',
  children,
  className = '',
  ...props 
}) => {
  const variants = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-md hover:shadow-lg',
    secondary: 'bg-secondary-100 hover:bg-secondary-200 text-secondary-700',
    ghost: 'hover:bg-secondary-100 text-secondary-600 hover:text-secondary-700',
    danger: 'bg-error-500 hover:bg-error-600 text-white'
  };
  
  const sizes = {
    sm: 'h-8 w-8 p-1.5',
    base: 'h-10 w-10 p-2',
    lg: 'h-12 w-12 p-3'
  };
  
  return (
    <button 
      className={`
        inline-flex items-center justify-center rounded-lg
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      <Icon className="h-full w-full" />
      {children}
    </button>
  );
};