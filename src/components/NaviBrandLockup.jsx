import React from 'react';
import { BRAND } from '@/lib/brandAssets';

/**
 * Wordmark oficial Evocto.
 * @param {'full' | 'mark' | 'auth' | 'dark'} variant
 */
export default function NaviBrandLockup({
  className = '',
  height = 36,
  variant = 'full',
  alt = BRAND.name,
}) {
  const src = variant === 'mark' ? BRAND.mark : BRAND.wordmark;
  const variantClass =
    variant === 'auth'
      ? 'navi-brand-lockup navi-brand-lockup--auth'
      : variant === 'mark'
        ? 'navi-brand-lockup navi-brand-lockup--mark'
        : 'navi-brand-lockup';

  return (
    <img
      src={src}
      alt={alt}
      height={height}
      className={`${variantClass}${className ? ` ${className}` : ''}`}
      style={{ height, width: 'auto', display: 'block', objectFit: 'contain' }}
      decoding="async"
    />
  );
}
