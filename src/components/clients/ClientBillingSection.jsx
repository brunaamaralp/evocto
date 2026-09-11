import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PAYMENT_METHODS } from '@/lib/paymentMethods';
import { listActivePaymentMethods } from '@/lib/paymentMethodSettings';
import { buildPlanSelectOptions } from '@/lib/academyPlans';
import { listBankAccountLabels } from '@/lib/bankAccounts';
import { EMPRESA_FINANCE_CONFIG_PATH } from '@/lib/financeiroHubTabs';
import { useLeadStore } from '@/store/useLeadStore';
import { FINANCE_DOMAIN } from '@/lib/financeDomain';

/**
 * Campos de cobrança de serviço (opt-in) no cadastro de Cliente.
 * Persistidos no payload do Client; consumidos via clientToFinancePerson.
 */
export default function ClientBillingSection({
  formData,
  onChange,
  agencyId,
  disabled = false,
}) {
  const financeConfig = useLeadStore((s) =>
    s.financeConfigAcademyId === agencyId ? s.financeConfig : null
  );

  const methods = useMemo(() => {
    const active = listActivePaymentMethods(financeConfig);
    return active.length ? active : PAYMENT_METHODS;
  }, [financeConfig]);

  const planOptions = useMemo(
    () => buildPlanSelectOptions(financeConfig, formData.plan || ''),
    [financeConfig, formData.plan]
  );

  const bankOptions = useMemo(() => listBankAccountLabels(financeConfig), [financeConfig]);

  const hasConfiguredPlans = (financeConfig?.plans || []).some((p) => String(p?.name || '').trim());
  const billingOn = Boolean(formData.billing_enabled);

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {FINANCE_DOMAIN.recurringChargeTab} de serviço
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Quando ativo, o cliente entra nas {FINANCE_DOMAIN.recurringChargePlural.toLowerCase()}. O
            valor e o dia de vencimento viram uma receita recorrente no Financeiro.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor="billing_enabled" className="text-xs text-muted-foreground">
            Ativar
          </Label>
          <Switch
            id="billing_enabled"
            checked={billingOn}
            onCheckedChange={(checked) => onChange('billing_enabled', checked)}
            disabled={disabled}
          />
        </div>
      </div>

      {billingOn ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_plan">Pacote de serviço *</Label>
            <Select
              value={formData.plan || undefined}
              onValueChange={(planName) => {
                onChange('plan', planName);
                const opt = planOptions.find((o) => o.value === planName);
                if (opt?.plan && Number(opt.plan.price) >= 0) {
                  onChange('plan_price', Number(opt.plan.price) || 0);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger id="client_plan" className="w-full">
                <SelectValue placeholder="Selecione o pacote…" />
              </SelectTrigger>
              <SelectContent>
                {planOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hasConfiguredPlans ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                Nenhum pacote cadastrado. Configure em{' '}
                <Link to={EMPRESA_FINANCE_CONFIG_PATH} className="underline underline-offset-2">
                  Minha agência → Financeiro
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan_price">Valor acordado (R$)</Label>
              <Input
                id="plan_price"
                type="number"
                min={0}
                step="0.01"
                value={formData.plan_price === '' || formData.plan_price == null ? '' : formData.plan_price}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange('plan_price', v === '' ? '' : Number(v));
                }}
                placeholder="0,00"
                disabled={disabled}
              />
              <p className="text-[11px] text-muted-foreground">
                Snapshot do preço; mudanças no catálogo não alteram este valor.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_day">Dia de vencimento</Label>
              <Input
                id="due_day"
                type="number"
                min={1}
                max={31}
                value={formData.due_day ?? 10}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  onChange('due_day', Number.isFinite(n) ? n : '');
                }}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount_amount">Desconto recorrente (R$)</Label>
            <Input
              id="discount_amount"
              type="number"
              min={0}
              step="0.01"
              value={
                formData.discount_amount === '' || formData.discount_amount == null
                  ? ''
                  : formData.discount_amount
              }
              onChange={(e) => {
                const v = e.target.value;
                onChange('discount_amount', v === '' ? '' : Number(v));
              }}
              placeholder="0,00"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_contact_name">Responsável financeiro / quem paga</Label>
            <Input
              id="billing_contact_name"
              value={formData.billing_contact_name || ''}
              onChange={(e) => onChange('billing_contact_name', e.target.value)}
              placeholder="Nome como aparece no extrato, se diferente da empresa"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferred_payment_method">Forma de pagamento habitual</Label>
              <Select
                value={formData.preferred_payment_method || '__none__'}
                onValueChange={(v) =>
                  onChange('preferred_payment_method', v === '__none__' ? '' : v)
                }
                disabled={disabled}
              >
                <SelectTrigger id="preferred_payment_method" className="w-full">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não definido</SelectItem>
                  {methods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_payment_account">Conta habitual</Label>
              <Select
                value={formData.preferred_payment_account || '__none__'}
                onValueChange={(v) =>
                  onChange('preferred_payment_account', v === '__none__' ? '' : v)
                }
                disabled={disabled}
              >
                <SelectTrigger id="preferred_payment_account" className="w-full">
                  <SelectValue placeholder="Não definida…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não definida…</SelectItem>
                  {formData.preferred_payment_account &&
                  !bankOptions.includes(formData.preferred_payment_account) ? (
                    <SelectItem value={formData.preferred_payment_account}>
                      {formData.preferred_payment_account} (cadastro anterior)
                    </SelectItem>
                  ) : null}
                  {bankOptions.map((lbl) => (
                    <SelectItem key={lbl} value={lbl}>
                      {lbl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bankOptions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Nenhuma conta cadastrada. Configure em{' '}
                  <Link to={EMPRESA_FINANCE_CONFIG_PATH} className="underline underline-offset-2">
                    Minha agência → Financeiro
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
