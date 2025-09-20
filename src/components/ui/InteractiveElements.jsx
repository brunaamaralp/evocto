import React, { useState } from 'react';
import { Typography } from '@/components/ui/design-system';
import { ChevronRight, ExternalLink, Copy, Check } from 'lucide-react';

export const ActionCard = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  href,
  variant = 'default',
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const content = (
    <>
      {Icon && (
        <div className={`
          p-3 rounded-lg transition-all duration-200
          ${variant === 'primary' ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-secondary-600'}
          ${isHovered ? 'transform scale-110' : ''}
        `}>
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="flex-1">
        <Typography variant="h5" className="mb-1">
          {title}
        </Typography>
        <Typography variant="body2" className="text-secondary-600">
          {description}
        </Typography>
      </div>
      <ChevronRight className={`
        h-5 w-5 text-secondary-400 transition-transform duration-200
        ${isHovered ? 'translate-x-1' : ''}
      `} />
    </>
  );

  const baseClasses = `
    flex items-center gap-4 p-4 rounded-xl border border-secondary-200
    transition-all duration-200 hover-lift cursor-pointer group
    ${isHovered ? 'border-primary-300 bg-primary-50' : 'bg-white hover:bg-secondary-25'}
    ${className}
  `;

  if (href) {
    return (
      <a
        href={href}
        className={baseClasses}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className={baseClasses}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </div>
  );
};

export const CopyButton = ({ text, children, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
        text-sm font-medium transition-all duration-200
        ${copied 
          ? 'bg-success-100 text-success-700 border border-success-200' 
          : 'bg-secondary-100 text-secondary-700 border border-secondary-200 hover:bg-secondary-200'
        }
        ${className}
      `}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {children || (copied ? 'Copiado!' : 'Copiar')}
    </button>
  );
};

export const ProgressBar = ({ value, max = 100, className = '', showLabel = true }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center">
          <Typography variant="caption" className="text-secondary-600">
            Progresso
          </Typography>
          <Typography variant="caption" className="text-secondary-500">
            {Math.round(percentage)}%
          </Typography>
        </div>
      )}
      <div className="w-full bg-secondary-200 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-primary-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const StatusIndicator = ({ 
  status, 
  label, 
  pulse = false,
  size = 'base' 
}) => {
  const statusColors = {
    active: 'bg-success-500',
    inactive: 'bg-secondary-400',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    processing: 'bg-primary-500'
  };
  
  const sizes = {
    sm: 'h-2 w-2',
    base: 'h-3 w-3',
    lg: 'h-4 w-4'
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`
        rounded-full ${statusColors[status]} ${sizes[size]}
        ${pulse ? 'animate-pulse' : ''}
      `} />
      {label && (
        <Typography variant="caption" className="text-secondary-600">
          {label}
        </Typography>
      )}
    </div>
  );
};