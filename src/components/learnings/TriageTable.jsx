import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export default function TriageTable({ items = [], confidenceMin = 0, onConfidenceMinChange, onToggleShare }) {
  const filtered = items.filter(i => (i.confidence_score || 0) >= confidenceMin);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">Confiança mínima:</span>
        <div className="w-48">
          <Slider value={[confidenceMin]} min={0} max={100} step={5} onValueChange={(v) => onConfidenceMinChange(v[0])} />
        </div>
        <Badge variant="outline">{confidenceMin}%</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((l) => (
          <div key={l.id} className="bg-white border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">{l.title}</div>
              <Badge>{l.status}</Badge>
            </div>
            <div className="text-sm text-slate-600 line-clamp-2">{l.description}</div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">Confiança: {l.confidence_score ?? 0}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Compartilhar com cliente</span>
                <Switch checked={!!l.isShared} onCheckedChange={(v) => onToggleShare(l, v)} />
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-slate-500">Nenhum aprendizado com a confiança mínima selecionada.</div>
        )}
      </div>
    </div>
  );
}