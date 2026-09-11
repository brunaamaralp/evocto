import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CyclePlan } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { duplicateCycleForMonth } from '@/api/functions/duplicateCycleForMonth';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function nextMonthStart(fromYmd) {
  const d = new Date(`${String(fromYmd || todayYmd()).slice(0, 10)}T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

/**
 * Wizard: duplicar ciclo / novo mês no mesmo serviço.
 */
export default function DuplicateCycleWizard({
  open,
  onOpenChange,
  serviceId,
  defaultCyclePlanId = '',
  onSuccess,
}) {
  const { agencyId, user } = useSession();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [sourceCyclePlanId, setSourceCyclePlanId] = useState(defaultCyclePlanId || '');
  const [startDate, setStartDate] = useState(todayYmd());
  const [generateTasks, setGenerateTasks] = useState(true);

  useEffect(() => {
    if (!open || !agencyId || !serviceId) return;

    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const list = await CyclePlan.filter({ agencyId, serviceId }).catch(() => []);
        const sorted = (Array.isArray(list) ? list : []).slice().sort((a, b) => {
          const da = String(a.start_date || a.startDate || a.created_date || '');
          const db = String(b.start_date || b.startDate || b.created_date || '');
          return db.localeCompare(da);
        });
        if (cancelled) return;
        setCycles(sorted);
        const preferred =
          defaultCyclePlanId ||
          sorted[0]?.id ||
          '';
        setSourceCyclePlanId(preferred);
        const source = sorted.find((c) => c.id === preferred) || sorted[0];
        const sourceStart = source?.start_date || source?.startDate;
        setStartDate(nextMonthStart(sourceStart));
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar ciclos');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, agencyId, serviceId, defaultCyclePlanId]);

  const selected = useMemo(
    () => cycles.find((c) => c.id === sourceCyclePlanId),
    [cycles, sourceCyclePlanId]
  );

  const handleSubmit = async () => {
    if (!sourceCyclePlanId || !startDate) return;
    setLoading(true);
    try {
      const result = await duplicateCycleForMonth({
        sourceCyclePlanId,
        startDate,
        generateTasks,
        ownerId: user?.id || user?.data?.id,
      });
      toast.success(
        generateTasks
          ? `Novo mês criado com ${result.tasksCreated} tarefas`
          : 'Novo mês operacional criado'
      );
      onOpenChange?.(false);
      onSuccess?.(result);
      navigate(
        createPageUrl(`delivery-workspace?serviceId=${result.service.id}&section=tasks`)
      );
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Falha ao duplicar o mês');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Duplicar mês operacional
          </DialogTitle>
          <DialogDescription>
            Reutiliza o mesmo serviço e gera um novo mês só com datas atualizadas.
          </DialogDescription>
        </DialogHeader>

        {loadingList ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Carregando meses…
          </div>
        ) : cycles.length === 0 ? (
          <p className="text-sm text-amber-700 py-4">
            Este serviço ainda não tem mês operacional para duplicar. Use “Novo mês
            operacional”.
          </p>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label>Mês de origem *</Label>
              <Select value={sourceCyclePlanId} onValueChange={setSourceCyclePlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.cyclePeriod || c.id}
                      {c.start_date || c.startDate
                        ? ` · ${String(c.start_date || c.startDate).slice(0, 10)}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected?.status && (
                <p className="text-xs text-slate-500 mt-1">Status origem: {selected.status}</p>
              )}
            </div>
            <div>
              <Label>Data de início do novo mês *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={generateTasks}
                onCheckedChange={(v) => setGenerateTasks(Boolean(v))}
              />
              Gerar tarefas das fases agora
            </label>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange?.(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading || loadingList || !sourceCyclePlanId || !startDate}
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Duplicando…
              </>
            ) : (
              'Criar novo mês'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
