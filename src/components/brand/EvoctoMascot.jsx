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
 * Mascote oficial (polvo) — PNG com fundo transparente.
 * Largura controlável via className (ex.: w-[8.5rem] sm:w-[12rem]).
 * @param {boolean} mark — versão enquadrada (square) para chips/avatar
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
