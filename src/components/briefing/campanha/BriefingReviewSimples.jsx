import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Pencil, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { Brief } from '@/api/entities';
import EmpresaConfigResumo from './EmpresaConfigResumo';
import EditarConfigCampanhaModal from './EditarConfigCampanhaModal';
import CampoEditModal from './CampoEditModal';
import { configFromEmpresa } from '@/lib/empresaConfig';
import {
  isCampanhaFormComplete,
  notifyNovoBriefing,
  saveCampanhaBriefing,
} from '@/lib/campanhaBriefing';
import { launchCampanhaFromBrief } from '@/lib/launchCampanhaFromBrief';

function ConfidenceBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const color =
    pct > 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-500';
  const warn = pct < 70;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="h-2 w-28 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-600">{pct}%</span>
      {warn ? (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      ) : (
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      )}
    </div>
  );
}

const DETECT_FIELDS = [
  { key: 'nome_campanha', parseKey: 'nome', label: '1. Nome da Campanha' },
  { key: 'objetivo', parseKey: 'objetivo', label: '2. Objetivo Comercial' },
  {
    key: 'acoes_comerciais',
    parseKey: 'acoes_comerciais',
    label: '3. Ações Comerciais',
  },
  {
    key: 'talento_locacao',
    parseKey: 'talento_locacao',
    label: '4. Quem Aparece / Locação',
  },
];

/**
 * Review dos 5 campos detectados + config automática.
 */
export default function BriefingReviewSimples({
  clientId,
  empresa,
  parsed,
  initialForm,
  textoLivre,
  onBack,
  onSuccess,
}) {
  const { user, agencyId } = useSession();
  const [form, setForm] = useState(() => ({ ...initialForm }));
  const [configOverride, setConfigOverride] = useState(null);
  const [editMesOpen, setEditMesOpen] = useState(false);
  const [editField, setEditField] = useState(null);
  const [saving, setSaving] = useState(false);

  const baseConfig = useMemo(() => configFromEmpresa(empresa), [empresa]);
  const effectiveConfig = configOverride || baseConfig;
  const canConfirm = isCampanhaFormComplete(form) && Boolean(empresa) && !saving;

  const handleConfirm = async () => {
    try {
      setSaving(true);
      const briefing = await saveCampanhaBriefing({
        agencyId,
        clientId,
        empresa,
        campanhaForm: form,
        configOverride,
        modo_criacao: 'texto_livre',
        userId: user?.id || user?.$id || null,
        texto_livre: textoLivre,
      });

      let launchResult;
      try {
        launchResult = await launchCampanhaFromBrief({
          briefing,
          agencyId,
          clientId,
          userId: user?.id || user?.$id || null,
          generateTasks: true,
          empresaNome: empresa?.nome,
        });
      } catch (launchErr) {
        console.error(launchErr);
        await Brief.delete(briefing.id).catch(() => {});
        throw new Error(
          launchErr?.message ||
            'Não foi possível criar o ciclo da campanha. Tente novamente.'
        );
      }

      await notifyNovoBriefing({
        agencyId,
        briefing: launchResult.briefing || briefing,
        empresaNome: empresa?.nome,
        actorUserId: user?.id || user?.$id,
      });

      toast.success(
        `${
          launchResult.cycleReused
            ? 'Campanha adicionada ao ciclo do mês'
            : 'Campanha criada'
        }${
          launchResult.tasksCreated
            ? ` · ${launchResult.tasksCreated} tarefa(s)`
            : ''
        }`
      );
      onSuccess?.(launchResult);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Erro ao criar campanha. Tente novamente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <EmpresaConfigResumo
        config={effectiveConfig}
        onEditMes={() => setEditMesOpen(true)}
      />

      <div>
        <h3 className="text-sm font-semibold mb-4">Campos detectados</h3>
        <div className="space-y-4">
          {DETECT_FIELDS.map((field) => {
            const detected = parsed?.[field.parseKey];
            const low = (detected?.confianca || 0) < 70;
            return (
              <div key={field.key} className="rounded-lg border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{field.label}</p>
                    <Input
                      className="mt-2"
                      value={form[field.key] || ''}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, [field.key]: e.target.value }))
                      }
                    />
                    {detected ? (
                      <ConfidenceBar value={detected.confianca} />
                    ) : (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Não detectado — preencha manualmente
                      </p>
                    )}
                    {low && detected && (
                      <p className="text-xs text-amber-600 mt-1">
                        Confiança baixa — revise antes de confirmar
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start w-full sm:w-auto shrink-0"
                    onClick={() => setEditField(field.key)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    {low || !detected ? 'Revisar' : 'Editar'}
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-sm font-medium">5. Data de Gravação</p>
            {parsed?.data && <ConfidenceBar value={parsed.data.confianca} />}
            {parsed?.data?.valor && (
              <p className="text-xs text-slate-500">Detectado: {parsed.data.valor}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Início</Label>
                <Input
                  type="date"
                  value={form.data_gravacao_inicio || ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, data_gravacao_inicio: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Fim</Label>
                <Input
                  type="date"
                  value={form.data_gravacao_fim || ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, data_gravacao_fim: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={!canConfirm} onClick={handleConfirm}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Criar campanha
        </Button>
        <Button type="button" variant="outline" onClick={onBack}>
          ← Voltar
        </Button>
      </div>

      <EditarConfigCampanhaModal
        open={editMesOpen}
        onOpenChange={setEditMesOpen}
        value={effectiveConfig}
        onSave={setConfigOverride}
      />

      <CampoEditModal
        open={Boolean(editField)}
        onOpenChange={(o) => !o && setEditField(null)}
        fieldKey={editField || 'nome_campanha'}
        detectedValue={
          DETECT_FIELDS.find((f) => f.key === editField)
            ? parsed?.[DETECT_FIELDS.find((f) => f.key === editField).parseKey]?.valor
            : ''
        }
        currentValue={editField ? form[editField] : ''}
        onSave={(val) => setForm((p) => ({ ...p, [editField]: val }))}
      />
    </div>
  );
}
