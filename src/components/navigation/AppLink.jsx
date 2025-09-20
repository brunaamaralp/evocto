import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Componente padronizado para navegação interna/externa
 * Substitui usos inconsistentes de Link e window.location.href
 */
export default function AppLink({ 
  to, 
  external = false, 
  children, 
  className = "",
  onClick,
  ...props 
}) {
  // Navegação externa (URLs completas, downloads, etc.)
  if (external || to.startsWith('http') || to.startsWith('mailto:') || to.startsWith('tel:')) {
    return (
      <a 
        href={to} 
        className={className}
        onClick={onClick}
        {...props}
        target={to.startsWith('http') ? '_blank' : undefined}
        rel={to.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  }

  // Navegação interna SPA
  const internalUrl = to.startsWith('/') ? to : createPageUrl(to);
  
  return (
    <Link 
      to={internalUrl} 
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
}