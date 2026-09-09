import { BRAND } from '@/lib/brandAssets';

/**
 * Wordmark oficial Evocto (PNG).
 * @param {'full' | 'mark' | 'auth' | 'dark'} variant
 *   mark = letra “e” estilizada (sidebar colapsado)
 *   dark = wordmark claro para fundos escuros (sidebar / rodapé)
 */
export default function NaviBrandLockup({
  className = '',
  height = 36,
  variant = 'full',
  alt = BRAND.name,
}) {
  const src =
    variant === 'mark'
      ? BRAND.logoMark
      : variant === 'dark'
        ? BRAND.wordmarkOnDark
        : BRAND.wordmark;

  const variantClass =
    variant === 'auth'
      ? 'navi-brand-lockup navi-brand-lockup--auth'
      : variant === 'mark'
        ? 'navi-brand-lockup navi-brand-lockup--mark'
        : variant === 'dark'
          ? 'navi-brand-lockup navi-brand-lockup--dark'
          : 'navi-brand-lockup';

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
        display: 'block',
        objectFit: 'contain',
        background: 'transparent',
      }}
      decoding="async"
    />
  );
}
