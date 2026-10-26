
// Design Tokens
export const designTokens = {
  colors: {
    primary: {
      50: '#EEF4FA',
      100: '#FCE8E3',
      200: '#FFD4C8',
      300: '#FF9A7A',
      400: '#FF643D',
      500: '#C02807', // Burnt Grape
      600: '#8A1C05',
      700: '#6B1504',
      800: '#4A0E03',
      900: '#1A0D0B'
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
      50: '#D0F7EC',
      500: '#22C98A',
      600: '#085041'
    },
    warning: {
      50: '#FFF8E6',
      500: '#C47A00',
      600: '#7A5A10'
    },
    error: {
      50: '#FDEBEC',
      500: '#E24B4A',
      600: '#8A2A2A'
    }
  },
  typography: {
    fonts: {
      sans: ['Manrope', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Monaco', 'monospace']
    },
    sizes: {
      xs: '0.75rem',    // 12px — alinhado a --font-sm
      sm: '0.875rem',   // 14px — --font-md
      base: '0.8125rem', // 13px — --font-base (Soft UI)
      lg: '0.9375rem',  // 15px — --font-lg
      xl: '1rem',       // 16px — --font-xl
      '2xl': '1.125rem', // 18px — --font-2xl
      '3xl': '1.25rem',  // 20px — --font-3xl
      '4xl': '1.5rem'    // 24px — --font-4xl
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
    outlined: 'bg-white border-2 border-[#FFD4C8]',
    ghost: 'bg-[#EEF4FA] border border-[#FCE8E3]'
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
    success: 'bg-[var(--color-success-surface)] text-[var(--color-accent-dark)] border-[color-mix(in_srgb,var(--color-accent)_35%,white)]',
    warning: 'bg-[#FFF8E6] text-[#7A5A10] border-[#F0DC9A]',
    error: 'bg-[color-mix(in_srgb,var(--color-danger)_12%,white)] text-[#8A2A2A] border-[color-mix(in_srgb,var(--color-danger)_35%,white)]',
    info: 'bg-[var(--color-primary-surface)] text-[var(--color-primary-dark)] border-[#FFD4C8]',
    neutral: 'bg-[#F1F1F3] text-[#4A4A55] border-[#D0D0D6]'
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