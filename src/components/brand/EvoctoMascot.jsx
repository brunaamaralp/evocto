import React from 'react';
import { BRAND } from '@/lib/brandAssets';

const SIZES = {
  sm: 64,
  md: 120,
  lg: 200,
  xl: 280,
  small: 96,
  medium: 160,
  large: 240,
};

/**
 * Mascote oficial (polvo) para empty states, onboarding e marketing.
 */
export default function EvoctoMascot({
  size = 'md',
  className = '',
  alt = `${BRAND.name} mascote`,
  mark = false,
}) {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.md;
  return (
    <img
      src={mark ? BRAND.mark : BRAND.mascot}
      alt={alt}
      width={px}
      height={px}
      className={className}
      style={{ width: px, height: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
      decoding="async"
    />
  );
}
