import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import EmpresaConfigResumo from './EmpresaConfigResumo';
import EditarConfigCampanhaModal from './EditarConfigCampanhaModal';
import { configFromEmpresa } from '@/lib/empresaConfig';
import {
  EMPTY_CAMPANHA_FORM,
  isCampanhaFormComplete,
  notifyNovoBriefing,
  saveCampanhaBriefing,
  validateCampanhaForm,
} from '@/lib/campanhaBriefing';
import {
  CICLOS_COMERCIAIS_OPS,
  TIPOS_CAMPANHA,
  previewPhasesForTipo,
} from '@/lib/tipoCampanhaPipeline';

/**
 * Formulário reduzido: 5 campos da campanha + tipo/ciclo/linha + herança da empresa.
 */
export default function BriefingFormSimples({
  clientId,
  empresa,
  cicloId = null,
  onSuccess,
  onSwitchToText,
  onNeedEmpresa,
}) {
  const { user, agencyId } = useSession();
  const [form, setForm] = useState({ ...EMPTY_CAMPANHA_FORM });
  const [configOverride, setConfigOverride] = useState(null);
  const [editMesOpen, setEditMesOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const baseConfig = useMemo(() => configFromEmpresa(empresa), [empresa]);
  const effectiveConfig = configOverride || baseConfig;
  const canSave = isCampanhaFormComplete(form) && Boolean(empresa) && !saving;
  const linhas = Array.isArray(empresa?.produtos_linhas) ? empresa.produtos_linhas : [];
  const phasePreview = useMemo(
    () => previewPhasesForTipo(form.tipo_campanha || '5_videos'),
    [form.tipo_campanha]
  );

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!empresa) {
      onNeedEmpresa?.();
      toast.error('Configure a empresa antes de salvar');
      return;
    }
    const { valid, errors: next } = validateCampanhaForm(form);
    setErrors(next);
    if (!valid) return;

    try {
      setSaving(true);
      const briefing = await saveCampanhaBriefing({
        agencyId,
        clientId,
        empresa,
        campanhaForm: form,
        configOverride,
        modo_criacao: 'formulario',
        cicloId,
        userId: user?.id || user?.$id || null,
      });
      await notifyNovoBriefing({
        agencyId,
        briefing,
        empresaNome: empresa.nome,
        actorUserId: user?.id || user?.$id,
      });
      toast.success('Briefing salvo');
      onSuccess?.(briefing);
    } catch (err) {
      console.error(err);
      if (err?.errors) setErrors(err.errors);
      toast.error('Erro ao salvar. Tente novamente');
    } finally {
      setSaving(false);
    }
  };

  if (!empresa) {
    return (
      <div className="space-y-4">
        <EmpresaConfigResumo config={null} />
        <Button onClick={onNeedEmpresa}>Configurar Empresa</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmpresaConfigResumo
        config={effectiveConfig}
        onEditMes={() => setEditMesOpen(true)}
      />

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4 tracking-wide">
          Preencha esta campanha
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>* Nome da Campanha</Label>
            <Input
              value={form.nome_campanha}
              onChange={(e) => setField('nome_campanha', e.target.value)}
              placeholder="Outono"
            />
            {errors.nome_campanha && (
              <p className="text-xs text-red-600">{errors.nome_campanha}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Tipo de campanha</Label>
              <Select
                value={form.tipo_campanha || '5_videos'}
                onValueChange={(v) => setField('tipo_campanha', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CAMPANHA.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ciclo comercial</Label>
              <Select
                value={form.ciclo_comercial || '__none__'}
                onValueChange={(v) =>
                  setField('ciclo_comercial', v === '__none__' ? '' : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {CICLOS_COMERCIAIS_OPS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Linha focal</Label>
              <Select
                value={form.linha_focal || '__none__'}
                onValueChange={(v) =>
                  setField('linha_focal', v === '__none__' ? '' : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {linhas.map((p) => (
                    <SelectItem key={p.id || p.nome} value={p.nome}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="mb-1 text-[11px] font-medium text-slate-500">
              Preview do pipeline ({phasePreview.length} fases)
            </p>
            <p className="text-xs text-slate-700">
              {phasePreview.map((p) => p.label).join(' → ')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>* Objetivo Comercial</Label>
            <Input
              value={form.objetivo}
              onChange={(e) => setField('objetivo', e.target.value)}
              placeholder="Aumentar vendas"
            />
            {errors.objetivo && <p className="text-xs text-red-600">{errors.objetivo}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>* Ações Comerciais</Label>
            <Textarea
              value={form.acoes_comerciais}
              onChange={(e) => setField('acoes_comerciais', e.target.value)}
              placeholder="Lança linha Gold, desconto 15%"
              className="min-h-[72px]"
            />
            {errors.acoes_comerciais && (
              <p className="text-xs text-red-600">{errors.acoes_comerciais}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>* Quem Aparece / Locação</Label>
            <Input
              value={form.talento_locacao}
              onChange={(e) => setField('talento_locacao', e.target.value)}
              placeholder="Dona, interior da loja"
            />
            {errors.talento_locacao && (
              <p className="text-xs text-red-600">{errors.talento_locacao}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>* Data gravação (início)</Label>
              <Input
                type="date"
                value={form.data_gravacao_inicio}
                onChange={(e) => setField('data_gravacao_inicio', e.target.value)}
              />
              {errors.data_gravacao_inicio && (
                <p className="text-xs text-red-600">{errors.data_gravacao_inicio}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>* Data gravação (fim)</Label>
              <Input
                type="date"
                value={form.data_gravacao_fim}
                onChange={(e) => setField('data_gravacao_fim', e.target.value)}
              />
              {errors.data_gravacao_fim && (
                <p className="text-xs text-red-600">{errors.data_gravacao_fim}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={!canSave} onClick={handleSave}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar Briefing
        </Button>
        {onSwitchToText && (
          <Button type="button" variant="outline" onClick={onSwitchToText}>
            Modo Texto Livre
          </Button>
        )}
      </div>

      <EditarConfigCampanhaModal
        open={editMesOpen}
        onOpenChange={setEditMesOpen}
        value={effectiveConfig}
        onSave={setConfigOverride}
      />
    </div>
  );
}
