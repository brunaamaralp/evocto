import { Link } from 'react-router-dom';
import {
  FileText,
  KeyRound,
  StickyNote,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { deriveClientInfoCenter } from '@/lib/clientInfoCenter';

function formatCount(n) {
  const num = Number(n) || 0;
  return num === 1 ? '1 item' : `${num} itens`;
}

function Tile({ to, icon: Icon, title, subtitle, empty }) {
  return (
    <Link
      to={to}
      className="flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-[#E8E5F5] bg-white px-3.5 py-3 transition-colors hover:border-[#d0d7e2] hover:bg-[#EEF4FA]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C02807]/35"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF4FA] text-[#555]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#ccc]" aria-hidden />
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-sm font-medium text-[#111]">{title}</p>
        <p className={`mt-0.5 truncate text-xs ${empty ? 'text-[#999]' : 'text-[#666]'}`}>
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

/**
 * Atalhos da central de informações do cliente (docs, acessos, notas, aprendizados).
 * Não exibe senhas nem preview de notas sensíveis.
 */
export default function ClientInfoCenterSummary({
  clientId,
  documents = [],
  accesses = [],
  generalNotes = '',
  client = null,
  learnings = [],
}) {
  if (!clientId) return null;

  const summary = deriveClientInfoCenter({
    documents,
    accesses,
    generalNotes,
    client,
    learnings,
    recentLimit: 3,
  });

  const docsHref = createPageUrl(`client-documents?clientId=${clientId}`);
  const acessosHref = createPageUrl(`client-acessos?clientId=${clientId}`);
  const learningsHref = createPageUrl(`client-learnings?clientId=${clientId}`);

  const accessesSubtitle =
    summary.accessesCount === 0
      ? 'Nenhum acesso cadastrado'
      : summary.accessesWithPassword > 0
        ? `${formatCount(summary.accessesCount)} · ${summary.accessesWithPassword} com senha`
        : formatCount(summary.accessesCount);

  return (
    <section aria-labelledby="info-center-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="info-center-heading" className="text-sm font-medium text-[#111]">
            Central do cliente
          </h2>
          <p className="mt-0.5 text-xs text-[#666]">
            Documentos, acessos e informações deste perfil
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Tile
          to={docsHref}
          icon={FileText}
          title="Documentos"
          subtitle={
            summary.documentsCount === 0
              ? 'Nenhum documento'
              : formatCount(summary.documentsCount)
          }
          empty={summary.documentsCount === 0}
        />
        <Tile
          to={acessosHref}
          icon={KeyRound}
          title="Acessos"
          subtitle={accessesSubtitle}
          empty={summary.accessesCount === 0}
        />
        <Tile
          to={acessosHref}
          icon={StickyNote}
          title="Informações"
          subtitle={summary.hasNotes ? 'Com anotações' : 'Sem anotações'}
          empty={!summary.hasNotes}
        />
        <Tile
          to={learningsHref}
          icon={Lightbulb}
          title="Aprendizados"
          subtitle={
            summary.learningsCount === 0
              ? 'Nenhum aprendizado'
              : formatCount(summary.learningsCount)
          }
          empty={summary.learningsCount === 0}
        />
      </div>

      {summary.recentDocuments.length > 0 ? (
        <div className="rounded-2xl border border-[#E8E5F5] bg-white px-3.5 py-3">
          <p className="text-xs font-medium text-[#7A7595]">Documentos recentes</p>
          <ul className="mt-1.5 space-y-0.5">
            {summary.recentDocuments.map((doc) => (
              <li key={doc.id}>
                <Link
                  to={createPageUrl(
                    `client-documents?clientId=${clientId}&documentId=${doc.id}`
                  )}
                  className="flex items-center justify-between gap-2 rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-[#EEF4FA]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C02807]/35"
                >
                  <span className="min-w-0 truncate font-medium text-[#18162A]">
                    {doc.title}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#ccc]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
