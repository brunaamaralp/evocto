import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  FileText,
  FolderOpen,
  Lightbulb,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { createPageUrl } from '@/utils';

const DOCUMENT_GROUPS = {
  diagnostic: 'Diagnóstico',
  report: 'Relatórios',
  deliverable: 'Entregáveis',
  contract: 'Contratos',
  presentation: 'Apresentações',
  analysis: 'Análises',
  other: 'Outros',
};

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

function KnowledgeSlot({
  icon: Icon,
  title,
  count,
  href,
  emptyTitle,
  emptyCta,
  children,
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-600" />
            {title}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
              <Link to={href}>
                Ver
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <div className="rounded-lg border border-dashed p-3 text-center">
            <p className="text-sm text-gray-600 mb-2">{emptyTitle}</p>
            {emptyCta && (
              <Button asChild size="sm" variant="outline">
                <Link to={emptyCta.href}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {emptyCta.label}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientKnowledgeSummary({
  clientId,
  briefs = [],
  learnings = [],
  evolutionEvents = [],
  documents = [],
  kpisCount = 0,
}) {
  const briefingHref = createPageUrl(`briefing-campanha?clientId=${clientId}`);
  const learningsHref = createPageUrl(`client-learnings?clientId=${clientId}`);
  const evolutionHref = createPageUrl(`client-evolution?clientId=${clientId}`);
  const documentsHref = createPageUrl(`client-documents?clientId=${clientId}`);
  const briefingListHref = createPageUrl(`client-briefing?clientId=${clientId}`);
  const kpisHref = createPageUrl(`performance-kpis?clientId=${clientId}`);

  const masterBrief = useMemo(() => {
    if (!briefs.length) return null;
    return (
      briefs.find((b) => ['READY', 'APPROVED'].includes(b.status)) ||
      briefs[0]
    );
  }, [briefs]);

  const topLearnings = useMemo(
    () =>
      [...learnings]
        .sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0))
        .slice(0, 3),
    [learnings]
  );

  const topEvents = useMemo(
    () =>
      [...evolutionEvents]
        .sort((a, b) => {
          if (a.impact === 'high' && b.impact !== 'high') return -1;
          if (b.impact === 'high' && a.impact !== 'high') return 1;
          const da = new Date(a.date || a.created_date || 0).getTime();
          const db = new Date(b.date || b.created_date || 0).getTime();
          return db - da;
        })
        .slice(0, 3),
    [evolutionEvents]
  );

  const docsByGroup = useMemo(() => {
    const counts = {};
    for (const doc of documents) {
      const key = doc.group || 'other';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [documents]);

  const pendingReview = learnings.filter((l) => !l.reviewed).length;

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KnowledgeSlot
          icon={FileText}
          title="Briefing"
          count={briefs.length}
          href={briefingListHref}
          emptyTitle="Nenhum briefing ainda"
          emptyCta={{
            label: 'Criar briefing',
            href: briefingHref,
          }}
        >
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {masterBrief?.nome_campanha || masterBrief?.title || 'Briefing principal'}
            </p>
            <Badge variant="outline">{briefStatusLabel(masterBrief?.status)}</Badge>
            {briefs.length > 1 && (
              <p className="text-xs text-gray-500">+{briefs.length - 1} outro(s)</p>
            )}
          </div>
        </KnowledgeSlot>

        <KnowledgeSlot
          icon={Lightbulb}
          title="Aprendizados"
          count={learnings.length}
          href={learningsHref}
          emptyTitle="Nenhum aprendizado registrado"
          emptyCta={{ label: 'Abrir biblioteca', href: learningsHref }}
        >
          <ul className="space-y-2">
            {pendingReview > 0 && (
              <li>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  {pendingReview} pendente(s) de revisão
                </Badge>
              </li>
            )}
            {topLearnings.map((item) => (
              <li key={item.id} className="text-sm truncate text-gray-800">
                {item.title || 'Aprendizado'}
              </li>
            ))}
          </ul>
        </KnowledgeSlot>

        <KnowledgeSlot
          icon={BookOpen}
          title="Evolução"
          count={evolutionEvents.length}
          href={evolutionHref}
          emptyTitle="Nenhum marco registrado"
          emptyCta={{ label: 'Ver evolução', href: evolutionHref }}
        >
          <ul className="space-y-2">
            {topEvents.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-gray-800">
                  {event.title || event.type || 'Evento'}
                </span>
                {event.impact && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {event.impact}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </KnowledgeSlot>

        <KnowledgeSlot
          icon={FolderOpen}
          title="Documentos"
          count={documents.length}
          href={
            documents[0]?.id
              ? createPageUrl(
                  `client-documents?clientId=${clientId}&documentId=${documents[0].id}`
                )
              : documentsHref
          }
          emptyTitle="Nenhum documento ainda"
          emptyCta={{ label: 'Abrir documentos', href: documentsHref }}
        >
          <ul className="space-y-1.5">
            {docsByGroup.map(([group, n]) => (
              <li key={group} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {DOCUMENT_GROUPS[group] || group}
                </span>
                <span className="font-medium text-gray-900">{n}</span>
              </li>
            ))}
          </ul>
        </KnowledgeSlot>
      </div>
    </section>
  );
}
