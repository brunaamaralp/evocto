import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Brief } from '@/api/entities';
import {
  briefPatchFromIdeia,
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(ideiaFromBrief(brief));
  }, [brief?.id, brief?.editado_em]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  const unit = normalizeCampanhaUnit(brief);

  return (
    <section className="space-y-6 max-w-2xl">
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
    </section>
  );
}
