import { BRAND } from '@/lib/brandAssets';

/**
 * Wordmark / isotipo oficial Narrativa.
 * @param {'full' | 'mark' | 'auth' | 'dark'} variant
 *   mark = isotipo aspas (sidebar colapsado)
 *   dark = wordmark cloud para fundos escuros (sidebar / rodape)
 */
export default function NarrativaBrandLockup({
  className = '',
  height = 36,
  variant = 'full',
  alt = BRAND.displayName || BRAND.name,
}) {
  const src =
    variant === 'mark'
      ? BRAND.logoMark
      : variant === 'dark'
        ? BRAND.wordmarkOnDark
        : BRAND.wordmark;

  const variantClass =
    variant === 'auth'
      ? 'narrativa-brand-lockup narrativa-brand-lockup--auth'
      : variant === 'mark'
        ? 'narrativa-brand-lockup narrativa-brand-lockup--mark'
        : variant === 'dark'
          ? 'narrativa-brand-lockup narrativa-brand-lockup--dark'
          : 'narrativa-brand-lockup';

  return (
    <img
      src={src}
      alt={alt}
      height={height}
      className={`${variantClass}${className ? ` ${className}` : ''}`}
      style={{
        height,
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        background: 'transparent',
      }}
      decoding="async"
    />
  );
}
