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
 * Isotipo Narrativa (aspas).
 * @param {boolean} mark — versao enquadrada para chips/avatar
 */
export default function NarrativaIsotipo({
  size = 'md',
  className = '',
  alt = `${BRAND.displayName || BRAND.name} isotipo`,
  mark = false,
}) {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.md;
  return (
    <img
      src={mark ? BRAND.mark : BRAND.mascot}
      alt={alt}
      width={px}
      height={mark ? px : undefined}
      className={className}
      style={{
        height: mark ? px : 'auto',
        width: mark ? px : undefined,
        maxWidth: mark ? px : '100%',
        objectFit: 'contain',
        background: 'transparent',
      }}
      decoding="async"
    />
  );
}
