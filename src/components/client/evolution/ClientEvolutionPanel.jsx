import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { EvolutionEvent } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
import {
  TrendingUp,
  Calendar,
  CheckCircle,
  Users,
  Plus,
  Loader2,
} from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import TimelineView from '@/components/evolution/TimelineView';
import MetricsView from '@/components/evolution/MetricsView';
import { toast } from 'sonner';
import { getCardPastel } from '@/lib/modulePastels';

const EVENT_TYPES = {
  milestone_achieved: 'Marco alcançado',
  learning_applied: 'Aprendizado aplicado',
  plan_approved: 'Plano aprovado',
  metrics_recorded: 'Métricas registradas',
  briefing_major_update: 'Atualização de briefing',
  other: 'Outro',
};

const IMPACT_OPTIONS = {
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

/**
 * Painel de evolução do cliente (aba).
 * O CTA de registrar fica no shell; o modal é controlado via createOpen.
 */
export default function ClientEvolutionPanel({
  clientId,
  serviceId,
  client,
  createOpen = false,
  onCreateOpenChange,
  onCountChange,
}) {
  const { user, agencyId, userId, userEmail } = useSession();
  const [loading, setLoading] = useState(true);
  const [evolutionEvents, setEvolutionEvents] = useState([]);
  const [viewMode, setViewMode] = useState('timeline');
  const [saving, setSaving] = useState(false);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const loadData = useCallback(async () => {
    if (!clientId || !agencyId) return;

    try {
      setLoading(true);
      const eventsData = await EvolutionEvent.filter({ agencyId, clientId }, '-date');
      const list = eventsData || [];
      setEvolutionEvents(list);
      onCountChangeRef.current?.(list.length);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar evolução do cliente');
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegister = async (payload) => {
    if (!agencyId || !clientId) {
      toast.error('Cliente ou agência não identificados');
      return;
    }

    try {
      setSaving(true);

      const metrics = {};
      if (payload.month) metrics.month = payload.month;
      if (payload.revenue !== '' && payload.revenue != null) {
        metrics.revenue = Number(payload.revenue);
      }
      if (payload.leads !== '' && payload.leads != null) {
        metrics.leads = Number(payload.leads);
      }
      if (payload.cpl !== '' && payload.cpl != null) {
        metrics.cpl = Number(payload.cpl);
      }

      const hasMetrics = Object.keys(metrics).length > 0;
      const type =
        hasMetrics && payload.type === 'other' ? 'metrics_recorded' : payload.type;

      await EvolutionEvent.create({
        agencyId,
        clientId,
        serviceId: serviceId || null,
        type,
        title: payload.title.trim(),
        description: payload.description?.trim() || '',
        date: payload.date || new Date().toISOString(),
        impact: payload.impact || 'medium',
        confidence: 1,
        authored_by: userEmail || user?.email || userId || 'manual',
        requires_review: false,
        metrics: hasMetrics ? metrics : null,
        businessMetricJSON: hasMetrics ? metrics : null,
        source: {
          kind: 'manual_note',
          snippets: [],
        },
      });

      toast.success('Registro de evolução salvo!');
      onCreateOpenChange?.(false);
      await loadData();
    } catch (error) {
      console.error('Erro ao registrar evolução:', error);
      toast.error(error?.message || 'Erro ao registrar evolução');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando evolução do cliente..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant={viewMode === 'timeline' ? 'default' : 'outline'}
          onClick={() => setViewMode('timeline')}
          size="sm"
        >
          Timeline
        </Button>
        <Button
          variant={viewMode === 'metrics' ? 'default' : 'outline'}
          onClick={() => setViewMode('metrics')}
          size="sm"
        >
          Métricas
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Calendar, label: 'Total de Eventos', value: evolutionEvents.length, idx: 1 },
          {
            icon: TrendingUp,
            label: 'Alto Impacto',
            value: evolutionEvents.filter((e) => e.impact === 'high').length,
            idx: 4,
          },
          {
            icon: CheckCircle,
            label: 'Marcos Alcançados',
            value: evolutionEvents.filter((e) => e.type === 'milestone_achieved').length,
            idx: 2,
          },
          {
            icon: Users,
            label: 'Aprendizados Aplicados',
            value: evolutionEvents.filter((e) => e.type === 'learning_applied').length,
            idx: 3,
          },
        ].map(({ icon: Icon, label, value, idx }) => {
          const pastel = getCardPastel(idx);
          return (
            <Card key={label} className={`rounded-2xl border-transparent shadow-sm ${pastel.bg}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${pastel.tag}`}
                  >
                    <Icon className={`w-5 h-5 ${pastel.text}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#18162A]">{value}</p>
                    <p className="text-sm text-[#7A7595]">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {evolutionEvents.length === 0 ? (
        <EmptyState
          icon="usuarios"
          title="Nenhuma evolução registrada"
          description="Registre marcos, métricas ou mudanças estratégicas deste cliente."
          primaryAction={{
            label: 'Registrar evolução',
            onClick: () => onCreateOpenChange?.(true),
          }}
        />
      ) : (
        <div className="space-y-6">
          {viewMode === 'timeline' ? (
            <TimelineView events={evolutionEvents} client={client} />
          ) : (
            <MetricsView events={evolutionEvents} client={client} />
          )}
        </div>
      )}

      <RegisterEvolutionModal
        isOpen={createOpen}
        onClose={() => !saving && onCreateOpenChange?.(false)}
        onSubmit={handleRegister}
        saving={saving}
        preferMetrics={viewMode === 'metrics'}
      />
    </div>
  );
}

function RegisterEvolutionModal({ isOpen, onClose, onSubmit, saving, preferMetrics }) {
  const [form, setForm] = useState({
    type: preferMetrics ? 'metrics_recorded' : 'milestone_achieved',
    title: '',
    description: '',
    impact: 'medium',
    date: new Date().toISOString().slice(0, 10),
    month: new Date().toISOString().slice(0, 7),
    revenue: '',
    leads: '',
    cpl: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      type: preferMetrics ? 'metrics_recorded' : 'milestone_achieved',
      title: preferMetrics ? 'Métricas do período' : '',
      description: '',
      impact: 'medium',
      date: new Date().toISOString().slice(0, 10),
      month: new Date().toISOString().slice(0, 7),
      revenue: '',
      leads: '',
      cpl: '',
    });
  }, [isOpen, preferMetrics]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Informe um título');
      return;
    }
    onSubmit({
      ...form,
      date: form.date
        ? new Date(`${form.date}T12:00:00`).toISOString()
        : new Date().toISOString(),
    });
  };

  const showMetricsFields = form.type === 'metrics_recorded' || preferMetrics;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {preferMetrics ? 'Registrar métricas' : 'Registrar evolução'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Impacto</Label>
              <Select
                value={form.impact}
                onValueChange={(value) => setForm((prev) => ({ ...prev, impact: value }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPACT_OPTIONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evo-title">Título</Label>
            <Input
              id="evo-title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="evo-description">Descrição (opcional)</Label>
            <Textarea
              id="evo-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="evo-date">Data</Label>
            <Input
              id="evo-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              disabled={saving}
            />
          </div>

          {showMetricsFields && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/60">
              <p className="text-sm font-medium text-slate-800">Métricas do período</p>
              <div className="space-y-2">
                <Label htmlFor="evo-month">Mês de referência</Label>
                <Input
                  id="evo-month"
                  type="month"
                  value={form.month}
                  onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="evo-revenue">Receita</Label>
                  <Input
                    id="evo-revenue"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.revenue}
                    onChange={(e) => setForm((prev) => ({ ...prev, revenue: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evo-leads">Leads</Label>
                  <Input
                    id="evo-leads"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.leads}
                    onChange={(e) => setForm((prev) => ({ ...prev, leads: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evo-cpl">CPL</Label>
                  <Input
                    id="evo-cpl"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.cpl}
                    onChange={(e) => setForm((prev) => ({ ...prev, cpl: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
