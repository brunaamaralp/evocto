import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/components/navigation/NavigationTracker';
import { cn } from '@/lib/utils';

/**
 * Botão Voltar do shell mobile (lg:hidden).
 * history.back se houver histórico SPA; senão pai contextual.
 */
export default function ShellBackButton({ className }) {
  const { goBack, canNavigateBack } = useNavigation();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'lg:hidden rounded-full h-11 w-11 min-h-[44px] min-w-[44px] p-0 shrink-0',
        className
      )}
      onClick={goBack}
      disabled={!canNavigateBack}
      aria-label="Voltar"
    >
      <ChevronLeft className="h-5 w-5" />
    </Button>
  );
}
