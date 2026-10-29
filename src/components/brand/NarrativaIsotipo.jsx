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
 * Por padrão usa aspas táteis sem fundo (integra no canvas da página).
 * @param {boolean} mark — SVG vetorial enquadrado (chips / sidebar)
 * @param {'aspas'|'svg'|'cereja'|'azulClaro'|'azulJeans'} [variant]
 */
export default function NarrativaIsotipo({
  size = 'md',
  className = '',
  alt = `${BRAND.displayName || BRAND.name} isotipo`,
  mark = false,
  variant = 'aspas',
}) {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.md;

  const src = mark
    ? BRAND.mark
    : variant === 'svg'
      ? BRAND.mark
      : variant === 'cereja'
        ? BRAND.isotipoCereja
        : variant === 'azulClaro'
          ? BRAND.isotipoAzulClaro
          : variant === 'azulJeans'
            ? BRAND.isotipoAzulJeans
            : BRAND.isotipoAspas || BRAND.mascot;

  return (
    <img
      src={src}
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
