import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, AlertTriangle, Lightbulb } from 'lucide-react';
import { CICLO_LABELS, MES_LABELS } from '@/lib/campanhaAnual';
import { DIMENSAO_KEYS, normalizeCampanhaMesGerada } from '@/lib/campanhaAnualSchema';

const DIM_LABELS = {
  '01_estrategia': 'Estratégia',
  '02_conceito': 'Conceito',
  '03_narrativa_visual': 'Narrativa visual',
  '04_identidade_visual': 'Identidade visual',
  '05_comunicacao': 'Comunicação',
  '06_experiencia': 'Experiência',
  '07_producao': 'Produção',
  '08_ativacao': 'Ativação',
  '09_mensuracao': 'Mensuração',
};

function DimBlock({ dimKey, data }) {
  if (!data || typeof data !== 'object') return null;
  return (
    <div className="rounded-md border bg-slate-50 p-3 space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {DIM_LABELS[dimKey] || dimKey}
      </div>
      <dl className="grid gap-1 text-sm">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-slate-800 break-words">
              {Array.isArray(v) ? v.join(', ') : String(v || '—')}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Review das 12 campanhas geradas (9 dimensões).
 */
export default function CampanhasAnualReview({
  campanhas = [],
  avisos = [],
  sugestoes = [],
  validacoes = null,
}) {
  const [openMes, setOpenMes] = useState(null);
  const list = (campanhas || []).map((c) => normalizeCampanhaMesGerada(c));

  return (
    <div className="space-y-4">
      {validacoes && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge
            variant="secondary"
            className={
              validacoes.ciclos_respeitados
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }
          >
            Ciclos {validacoes.ciclos_respeitados ? 'ok' : 'divergentes'}
          </Badge>
          {validacoes.variacao_narrativas &&
            Object.entries(validacoes.variacao_narrativas).map(([k, n]) => (
              <Badge key={k} variant="outline">
                {CICLO_LABELS[k] || k}: {n}
              </Badge>
            ))}
        </div>
      )}

      {avisos?.length > 0 && (
        <div className="space-y-2">
          {avisos.map((a, i) => (
            <div
              key={`aviso-${i}`}
              className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">
                  {a.mes ? `${MES_LABELS[a.mes]} · ` : ''}
                  {a.mensagem}
                </div>
                {a.sugestao && (
                  <div className="text-amber-800 mt-0.5">{a.sugestao}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sugestoes?.length > 0 && (
        <div className="space-y-2">
          {sugestoes.map((s, i) => (
            <div
              key={`sug-${i}`}
              className="flex gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950"
            >
              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {s.mes ? `${MES_LABELS[s.mes]}: ` : ''}
                {s.mensagem}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {list.map((c) => {
          const open = openMes === c.mes;
          return (
            <Collapsible
              key={c.mes}
              open={open}
              onOpenChange={(v) => setOpenMes(v ? c.mes : null)}
            >
              <Card>
                <CardHeader className="py-3 px-4">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-between h-auto py-2 px-1 hover:bg-transparent"
                    >
                      <div className="text-left space-y-1">
                        <CardTitle className="text-base font-semibold flex flex-wrap items-center gap-2">
                          <span>
                            {MES_LABELS[c.mes]} — {c.nome_campanha || 'Sem nome'}
                          </span>
                          {c.ciclo_comercial && (
                            <Badge variant="secondary">
                              {CICLO_LABELS[c.ciclo_comercial] || c.ciclo_comercial}
                            </Badge>
                          )}
                          {c.produto_focal && (
                            <Badge variant="outline">{c.produto_focal}</Badge>
                          )}
                        </CardTitle>
                        {c.resumo_executivo && (
                          <p className="text-sm text-slate-600 font-normal line-clamp-2">
                            {c.resumo_executivo}
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          open ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2 pb-4">
                    {DIMENSAO_KEYS.map((key) => (
                      <DimBlock key={key} dimKey={key} data={c[key]} />
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
