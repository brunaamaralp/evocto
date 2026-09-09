import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Service } from '@/api/entities';
import { toast } from 'sonner';
import { RefreshCw, Loader2 } from 'lucide-react';
import {
  ensureDeliverableSchedule,
  patchDeliverableSchedule,
  scheduleDeliverablesFs,
  normalizeDurationBusinessDays,
} from '@/lib/deliverableScheduleCore';
import { formatYmdBr, todayYmd } from '@/lib/businessDaysCore';
import StageGantt from './StageGantt';

export default function DeliveryWorkspaceSchedule({ service, tasks = [], onServiceUpdated }) {
  const [localDeliverables, setLocalDeliverables] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirtyInit, setDirtyInit] = useState(false);

  useEffect(() => {
    const start = service?.start_date || todayYmd();
    const ensured = ensureDeliverableSchedule(service?.deliverables || [], start);
    setLocalDeliverables(ensured);
    const needsPersist = (service?.deliverables || []).some(
      (d) => !d.planned_start || !d.planned_end || !d.duration_business_days
    );
    setDirtyInit(needsPersist && ensured.length > 0);
  }, [service?.id, service?.deliverables, service?.start_date]);

  const rows = useMemo(() => {
    return localDeliverables.map((d, index) => {
      const stageTasks = tasks.filter((t) => String(t.deliverableId) === String(d.id));
      const done = stageTasks.filter((t) => t.status === 'completed').length;
      const pct = stageTasks.length ? Math.round((done / stageTasks.length) * 100) : 0;
      const weekNum =
        (String(d.description || '').match(/semana\s*(\d)/i) || [])[1] ||
        String(index + 1);
      return {
        id: d.id,
        name: d.name,
        weekLabel: `S${weekNum}`,
        phase: d.phase || null,
        planned_start: d.planned_start,
        planned_end: d.planned_end,
        duration_business_days: d.duration_business_days || 7,
        status: d.status || 'not_started',
        pct,
        taskCount: stageTasks.length,
      };
    });
  }, [localDeliverables, tasks]);

  const persist = async (nextDeliverables, message) => {
    if (!service?.id) return;
    setSaving(true);
    try {
      await Service.update(service.id, { deliverables: nextDeliverables });
      setLocalDeliverables(nextDeliverables);
      setDirtyInit(false);
      onServiceUpdated?.({ ...service, deliverables: nextDeliverables });
      if (message) toast.success(message);
    } catch (err) {
      toast.error(err?.message || 'Falha ao salvar cronograma');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInit = () => persist(localDeliverables, 'Cronograma inicializado');

  const handleRebuild = () => {
    const start = service?.start_date || todayYmd();
    const rebuilt = scheduleDeliverablesFs({
      startDate: start,
      deliverables: localDeliverables,
    });
    persist(rebuilt, 'Cronograma recalculado em sequência');
  };

  const handleMove = (id, planned_start, planned_end) => {
    const { deliverables } = patchDeliverableSchedule(
      localDeliverables,
      id,
      { planned_start, planned_end },
      { cascade: false }
    );
    persist(deliverables);
  };

  const handleDurationChange = (id, raw) => {
    const duration = normalizeDurationBusinessDays(raw);
    const { deliverables, cascaded_ids } = patchDeliverableSchedule(
      localDeliverables,
      id,
      { duration_business_days: duration },
      { cascade: true }
    );
    const msg =
      cascaded_ids.length > 0
        ? `Duração atualizada · ${cascaded_ids.length} etapa(s) seguintes ajustadas`
        : 'Duração atualizada';
    persist(deliverables, msg);
  };

  if (!localDeliverables.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        Sem etapas para montar o cronograma. Configure entregáveis no serviço.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Cronograma</h2>
          <p className="text-xs text-slate-500">
            Dias úteis (seg–sex). Alterar duração empurra as etapas seguintes; arrastar no Gantt não
            cascateia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirtyInit ? (
            <Button size="sm" onClick={handleSaveInit} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
              Salvar datas geradas
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={handleRebuild} disabled={saving}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Recalcular sequência
          </Button>
        </div>
      </div>

      <StageGantt rows={rows} onMove={handleMove} />

      <Card className="border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Durações (dias úteis)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-slate-100 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {formatYmdBr(r.planned_start)} → {formatYmdBr(r.planned_end)}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {(r.status || '').replace(/_/g, ' ')}
                </Badge>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    className="w-20 h-8"
                    defaultValue={r.duration_business_days}
                    key={`${r.id}-${r.duration_business_days}`}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v && v !== r.duration_business_days) {
                        handleDurationChange(r.id, v);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  <span className="text-xs text-slate-500">dias</span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
