import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, ArrowRight, Plus } from 'lucide-react';
import { createPageUrl } from '@/utils';

function briefStatusLabel(status) {
  const map = {
    DRAFT: 'Rascunho',
    IN_REVIEW: 'Em revisão',
    READY: 'Pronto',
    APPROVED: 'Aprovado',
    draft: 'Rascunho',
    in_review: 'Em revisão',
  };
  return map[status] || status || '—';
}

export default function ClientKnowledgeSummary({
  clientId,
  briefs = [],
  kpisCount = 0,
}) {
  const briefingHref = createPageUrl(`briefing-campanha?clientId=${clientId}`);
  const briefingListHref = createPageUrl(`client-briefing?clientId=${clientId}`);
  const kpisHref = createPageUrl(`performance-kpis?clientId=${clientId}`);

  const masterBrief = useMemo(() => {
    if (!briefs.length) return null;
    return (
      briefs.find((b) => ['READY', 'APPROVED'].includes(b.status)) ||
      briefs[0]
    );
  }, [briefs]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Conhecimento · Perfil Vivo
        </h2>
        <Button asChild variant="ghost" size="sm" className="text-gray-600">
          <Link to={kpisHref}>
            KPIs financeiros: {kpisCount}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              Briefing
            </span>
            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
              <Link to={briefingListHref}>
                Ver
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {briefs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-3 text-center">
              <p className="text-sm text-gray-600 mb-2">Nenhum briefing ainda</p>
              <Button asChild size="sm" variant="outline">
                <Link to={briefingHref}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Criar briefing
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {masterBrief?.nome_campanha || masterBrief?.title || 'Briefing principal'}
              </p>
              <Badge variant="outline">{briefStatusLabel(masterBrief?.status)}</Badge>
              {briefs.length > 1 && (
                <p className="text-xs text-gray-500">+{briefs.length - 1} outro(s)</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
