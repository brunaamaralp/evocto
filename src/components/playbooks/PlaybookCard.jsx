import React from "react";
import CardShell from "@/components/cards/CardShell";
import StatusBadge from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Lightbulb, Globe, Tag, Copy } from "lucide-react";

export default function PlaybookCard({ item }) {
  const [open, setOpen] = React.useState(false);
  const confidencePct = Math.round((item.confidence ?? 0) * 100);

  const applicability = item.applicability || {};
  const channels = applicability.channel || [];
  const segments = applicability.segment || [];
  const market = applicability.market || null;

  return (
    <CardShell
      title={item.title}
      subtitle={item.summary}
      actions={
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => {
            navigator.clipboard.writeText(`${item.title} — ${item.summary || ""}`);
          }}>
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Detalhes
          </Button>
        </div>
      }
      className="hover:shadow-md transition-shadow"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="min-w-[110px]">
            <div className="text-xs text-slate-500 mb-1">Confiança</div>
            <Progress value={confidencePct} className="h-2" />
          </div>
          {item.anonymized && <Badge variant="outline" className="gap-1"><Globe className="h-3.5 w-3.5" /> Anonimizado</Badge>}
          {item.serviceType && <Badge className="bg-blue-100 text-blue-800">{item.serviceType.replace("_", " ")}</Badge>}
          {item.sensitive && <Badge className="bg-red-100 text-red-800">Sensível</Badge>}
          {Array.isArray(item.competitor_tags) && item.competitor_tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="outline" className="gap-1"><Tag className="h-3.5 w-3.5" /> {t}</Badge>
          ))}
        </div>

        {open && (
          <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700 space-y-3">
            {!!channels.length && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-500">Canais:</span>
                {channels.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
              </div>
            )}
            {!!segments.length && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-500">Segmentos:</span>
                {segments.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            )}
            {market && (
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span className="text-xs text-slate-600">Mercado: {market}</span>
              </div>
            )}
            {Array.isArray(item.evidence) && item.evidence.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Evidências:</div>
                <ul className="list-disc ml-5 space-y-1">
                  {item.evidence.slice(0, 5).map((e, i) => (
                    <li key={i} className="text-slate-700">{typeof e === "string" ? e : (e?.description || e?.value || "Evidência")}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </CardShell>
  );
}