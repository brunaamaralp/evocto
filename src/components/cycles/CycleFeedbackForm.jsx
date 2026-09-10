import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CyclePlan } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import {
  EMPTY_CYCLE_FEEDBACK,
  isCycleFeedbackComplete,
  normalizeCycleFeedback,
  validateCycleFeedback,
} from '@/lib/cycleFeedback';

/**
 * Form de resultado ao fim do ciclo — grava em CyclePlan.planData.feedback.
 */
export default function CycleFeedbackForm({
  cyclePlanId,
  cyclePlan: initialPlan = null,
  onSaved,
  compact = false,
}) {
  const { user } = useSession();
  const [plan, setPlan] = useState(initialPlan);
  const [form, setForm] = useState(() =>
    normalizeCycleFeedback(initialPlan?.planData?.feedback || initialPlan?.feedback)
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!initialPlan && Boolean(cyclePlanId));

  useEffect(() => {
    if (initialPlan) {
      setPlan(initialPlan);
      setForm(normalizeCycleFeedback(initialPlan?.planData?.feedback || initialPlan?.feedback));
      return;
    }
    if (!cyclePlanId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cp = await CyclePlan.get(cyclePlanId);
        if (cancelled) return;
        setPlan(cp);
        setForm(normalizeCycleFeedback(cp?.planData?.feedback || cp?.feedback));
      } catch (err) {
        console.error(err);
        toast.error('Não foi possível carregar o ciclo');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cyclePlanId, initialPlan]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!plan?.id) return;
    const { valid, errors: next } = validateCycleFeedback(form);
    setErrors(next);
    if (!valid) return;

    setSaving(true);
    try {
      const feedback = {
        ...normalizeCycleFeedback(form),
        registrado_em: new Date().toISOString(),
        registrado_por: user?.id || user?.data?.id || null,
      };
      const planData = {
        ...(plan.planData || {}),
        feedback,
      };
      const updated = await CyclePlan.update(plan.id, {
        planData,
        feedback,
        closing_notes: [
          form.o_que_funcionou && `Funcionou: ${form.o_que_funcionou}`,
          form.o_que_nao_funcionou && `Não funcionou: ${form.o_que_nao_funcionou}`,
          form.aprendizados && `Aprendizados: ${form.aprendizados}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      });
      setPlan(updated || { ...plan, planData, feedback });
      toast.success('Resultado do ciclo salvo');
      onSaved?.(updated || { ...plan, planData, feedback });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Falha ao salvar feedback');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando feedback…
      </div>
    );
  }

  if (!plan?.id) {
    return (
      <p className="text-sm text-slate-500">
        Salve/crie um ciclo para registrar o resultado.
      </p>
    );
  }

  const body = (
    <div className="space-y-3">
      {isCycleFeedbackComplete(form) ? (
        <p className="text-xs text-emerald-700">
          Feedback registrado
          {form.registrado_em
            ? ` em ${new Date(form.registrado_em).toLocaleDateString('pt-BR')}`
            : ''}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Vendas — meta</Label>
          <Input
            value={form.vendas_meta}
            onChange={(e) => setField('vendas_meta', e.target.value)}
            placeholder="+22%"
          />
        </div>
        <div className="space-y-1">
          <Label>Vendas — realizado</Label>
          <Input
            value={form.vendas_realizado}
            onChange={(e) => setField('vendas_realizado', e.target.value)}
            placeholder="+18%"
          />
        </div>
        <div className="space-y-1">
          <Label>Engagement — esperado</Label>
          <Input
            value={form.engagement_esperado}
            onChange={(e) => setField('engagement_esperado', e.target.value)}
            placeholder="8%"
          />
        </div>
        <div className="space-y-1">
          <Label>Engagement — realizado</Label>
          <Input
            value={form.engagement_realizado}
            onChange={(e) => setField('engagement_realizado', e.target.value)}
            placeholder="6.5%"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>O que funcionou</Label>
        <Textarea
          value={form.o_que_funcionou}
          onChange={(e) => setField('o_que_funcionou', e.target.value)}
          className="min-h-[64px]"
        />
      </div>
      <div className="space-y-1">
        <Label>O que não funcionou</Label>
        <Textarea
          value={form.o_que_nao_funcionou}
          onChange={(e) => setField('o_que_nao_funcionou', e.target.value)}
          className="min-h-[64px]"
        />
      </div>
      <div className="space-y-1">
        <Label>Aprendizados</Label>
        <Textarea
          value={form.aprendizados}
          onChange={(e) => setField('aprendizados', e.target.value)}
          className="min-h-[64px]"
        />
        {errors.aprendizados ? (
          <p className="text-xs text-red-600">{errors.aprendizados}</p>
        ) : null}
      </div>

      <Button type="button" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Salvar resultado
      </Button>
    </div>
  );

  if (compact) return body;

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Resultado do ciclo</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

export { EMPTY_CYCLE_FEEDBACK };
