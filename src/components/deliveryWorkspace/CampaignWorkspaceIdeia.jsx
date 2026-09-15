import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Brief } from '@/api/entities';
import {
  briefPatchFromFinalize,
  briefPatchFromIdeia,
  finalizeFromBrief,
  ideiaFromBrief,
  normalizeCampanhaUnit,
} from '@/lib/campanhaIdeia';

const FIELDS = [
  { key: 'titulo', label: 'Título', multiline: false },
  { key: 'conceito', label: 'Conceito', multiline: true },
  { key: 'mecanismo', label: 'Mecanismo', multiline: true },
  { key: 'foco', label: 'Foco', multiline: false },
  { key: 'ciclo', label: 'Ciclo', multiline: false },
];

export default function CampaignWorkspaceIdeia({
  brief,
  onSaved,
}) {
  const [form, setForm] = useState(() => ideiaFromBrief(brief));
  const [finalize, setFinalize] = useState(() => finalizeFromBrief(brief));
  const [saving, setSaving] = useState(false);
  const [savingFinalize, setSavingFinalize] = useState(false);

  useEffect(() => {
    setForm(ideiaFromBrief(brief));
    setFinalize(finalizeFromBrief(brief));
  }, [brief?.id, brief?.editado_em]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setFinalizeField = (key, value) => {
    setFinalize((prev) => ({ ...prev, [key]: value }));
  };

  const setResultadoField = (key, value) => {
    setFinalize((prev) => ({
      ...prev,
      resultado: { ...prev.resultado, [key]: value },
    }));
  };

  const handleSave = async () => {
    if (!brief?.id) return;
    setSaving(true);
    try {
      const patch = briefPatchFromIdeia(form);
      const updated = await Brief.update(brief.id, patch);
      toast.success('Ideia salva');
      onSaved?.(updated || { ...brief, ...patch });
    } catch (err) {
      console.error('[CampaignWorkspaceIdeia]', err);
      toast.error(err?.message || 'Não foi possível salvar a ideia');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFinalize = async () => {
    if (!brief?.id) return;
    setSavingFinalize(true);
    try {
      const patch = briefPatchFromFinalize(finalize, {
        appendHistorico: true,
        historicoAtual: Array.isArray(brief.historico) ? brief.historico : [],
      });
      const updated = await Brief.update(brief.id, patch);
      toast.success('Fechamento salvo');
      onSaved?.(updated || { ...brief, ...patch });
    } catch (err) {
      console.error('[CampaignWorkspaceIdeia] finalize', err);
      toast.error(err?.message || 'Não foi possível salvar o fechamento');
    } finally {
      setSavingFinalize(false);
    }
  };

  const unit = normalizeCampanhaUnit(brief);
  const r = finalize.resultado || {};

  return (
    <section className="space-y-8 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Ideia</h2>
          <p className="text-sm text-slate-500 mt-1">
            Conceito, ciclo, mecanismo e foco desta campanha
            {unit?.mes ? ` · mês ${unit.mes}` : ''}
            {unit?.ano ? `/${unit.ano}` : ''}.
          </p>
        </div>

        <div className="space-y-4">
          {FIELDS.map(({ key, label, multiline }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`ideia-${key}`}>{label}</Label>
              {multiline ? (
                <Textarea
                  id={`ideia-${key}`}
                  value={form[key] || ''}
                  onChange={(e) => setField(key, e.target.value)}
                  rows={3}
                />
              ) : (
                <Input
                  id={`ideia-${key}`}
                  value={form[key] || ''}
                  onChange={(e) => setField(key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar ideia'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={`/client-detail?clientId=${brief.clientId || brief.projectId || ''}`}>
              Voltar ao Hub
            </Link>
          </Button>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fechamento</h2>
          <p className="text-sm text-slate-500 mt-1">
            Resultado, aprendizado e feedback do cliente — alimentam o Panorama e o
            Brainstorm.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="fin-vendas">Vendas realizadas</Label>
            <Input
              id="fin-vendas"
              type="number"
              inputMode="decimal"
              value={r.vendas_realizado ?? ''}
              onChange={(e) =>
                setResultadoField(
                  'vendas_realizado',
                  e.target.value === '' ? null : e.target.value
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-engaj">Engajamento</Label>
            <Input
              id="fin-engaj"
              type="number"
              inputMode="decimal"
              value={r.engajamento_realizado ?? ''}
              onChange={(e) =>
                setResultadoField(
                  'engajamento_realizado',
                  e.target.value === '' ? null : e.target.value
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fin-nota">Nota geral (1–10)</Label>
            <Input
              id="fin-nota"
              type="number"
              min={1}
              max={10}
              inputMode="numeric"
              value={r.nota_geral ?? ''}
              onChange={(e) =>
                setResultadoField(
                  'nota_geral',
                  e.target.value === '' ? null : e.target.value
                )
              }
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fin-ok">O que funcionou</Label>
          <Textarea
            id="fin-ok"
            rows={2}
            value={r.o_que_funcionou || ''}
            onChange={(e) => setResultadoField('o_que_funcionou', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fin-nok">O que não funcionou</Label>
          <Textarea
            id="fin-nok"
            rows={2}
            value={r.o_que_nao_funcionou || ''}
            onChange={(e) =>
              setResultadoField('o_que_nao_funcionou', e.target.value)
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fin-aprendizado">Aprendizado</Label>
          <Textarea
            id="fin-aprendizado"
            rows={3}
            value={finalize.aprendizado || ''}
            onChange={(e) => setFinalizeField('aprendizado', e.target.value)}
            placeholder="O que levar para a próxima campanha"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fin-feedback">Feedback do cliente</Label>
          <Textarea
            id="fin-feedback"
            rows={2}
            value={finalize.feedbackCliente || ''}
            onChange={(e) => setFinalizeField('feedbackCliente', e.target.value)}
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={handleSaveFinalize}
          disabled={savingFinalize}
        >
          {savingFinalize ? 'Salvando…' : 'Salvar fechamento'}
        </Button>
      </div>
    </section>
  );
}
