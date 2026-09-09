/**
 * Adaptação de domínio Nave (academia BJJ) → Evocto (agência).
 * Mantém os slugs/IDs internos do Nave para o código copiado continuar funcionando;
 * só a linguagem de UI e aliases de entidade mudam.
 */

import {
  parsePayerAliasesJson,
  serializePayerAliases,
  normalizePayerName,
  appendPayerAlias,
} from './studentPayerAliases.js';
import { STUDENT_STATUS } from './studentStatus.js';

export const FINANCE_DOMAIN = {
  org: 'agência',
  orgTitle: 'Minha agência',
  person: 'cliente',
  personPlural: 'clientes',
  personTitle: 'Cliente',
  recurringCharge: 'cobrança de serviço',
  recurringChargePlural: 'cobranças de serviço',
  recurringChargeTab: 'Cobranças',
  plans: 'pacotes de serviço',
  plansTitle: 'Pacotes',
  tuitionMirror: 'caixa da agência',
};

/** Labels de seção "A receber" com vocabulário de agência. */
export const AGENCY_RECEIVABLES_SECTION_LABELS = {
  visao: 'Visão geral',
  mensalidades: 'Cobranças',
  cobranca: 'Régua de cobrança',
  outros: 'Outros',
};

export function isClientBillingEnabled(client) {
  if (!client || typeof client !== 'object') return false;
  const v = client.billing_enabled ?? client.billingEnabled;
  return v === true || v === 1 || v === 'true' || v === '1';
}

/**
 * Status operacional Nave a partir do Client Evocto.
 * Só `active` quando cobrança ligada e status da empresa ativo.
 */
export function mapClientToStudentStatus(client) {
  if (!isClientBillingEnabled(client)) return STUDENT_STATUS.INACTIVE;
  const s = String(client?.status || '').trim().toLowerCase();
  if (s === 'inativo' || s === 'inactive' || s === 'prospecto') {
    return STUDENT_STATUS.INACTIVE;
  }
  return STUDENT_STATUS.ACTIVE;
}

/**
 * Monta aliases iniciais para conciliação a partir do cadastro B2B.
 * Não sobrescreve aliases manuais/aprendidos já gravados.
 */
export function buildClientPayerAliases(client, existingRaw) {
  const existing = parsePayerAliasesJson(
    existingRaw ?? client?.payer_aliases_json ?? client?.payerAliases
  );
  let aliases = existing;
  const candidates = [
    { display: client?.billing_contact_name || client?.billingContactName, source: 'from_responsavel' },
    { display: client?.legal_name || client?.legalName, source: 'manual' },
    { display: client?.name, source: 'manual' },
  ];
  for (const c of candidates) {
    const display = String(c.display || '').trim();
    if (!display) continue;
    const key = normalizePayerName(display);
    if (!key) continue;
    if (aliases.some((a) => a.normalized === key)) continue;
    const next = appendPayerAlias(aliases, { display, source: c.source });
    aliases = next.aliases;
  }
  return aliases;
}

/**
 * Normaliza um Client Evocto no shape de "student/lead" que o módulo Nave espera.
 */
export function clientToFinancePerson(client) {
  if (!client) return null;
  const id = String(client.id || client.$id || '').trim();
  if (!id) return null;

  const billingEnabled = isClientBillingEnabled(client);
  const name = String(client.name || client.legal_name || client.company_name || 'Cliente').trim();
  const plan = String(
    client.plan || client.service_plan || client.billing_plan || client.billingPlan || ''
  ).trim();
  const planPrice =
    Number(client.plan_price ?? client.planPrice ?? client.retainer_value ?? client.monthly_fee ?? 0) ||
    0;
  const discountAmount = Number(client.discount_amount ?? client.discountAmount ?? 0) || 0;
  const dueRaw = Number(client.due_day ?? client.dueDay ?? client.billing_due_day ?? 0);
  const dueDay =
    Number.isFinite(dueRaw) && dueRaw >= 1 && dueRaw <= 31 ? Math.trunc(dueRaw) : 10;
  const studentStatus = mapClientToStudentStatus(client);
  const payerAliases = buildClientPayerAliases(client);
  const billingContact = String(
    client.billing_contact_name || client.billingContactName || ''
  ).trim();
  const preferredMethod = String(
    client.preferred_payment_method || client.preferredPaymentMethod || ''
  ).trim();
  const preferredAccount = String(
    client.preferred_payment_account || client.preferredPaymentAccount || ''
  ).trim();
  const agencyId = String(client.agencyId || client.agency_id || '').trim();

  return {
    id,
    $id: id,
    name,
    full_name: name,
    legal_name: String(client.legal_name || '').trim(),
    email: client.email || '',
    phone: client.phone || '',
    status: studentStatus === STUDENT_STATUS.ACTIVE ? 'Matriculado' : client.status || 'ativo',
    contact_type: 'student',
    _isStudent: billingEnabled,
    student_status: studentStatus,
    studentStatus,
    plan,
    plan_price: planPrice,
    planPrice,
    discount_amount: discountAmount,
    discountAmount,
    due_day: dueDay,
    dueDay,
    preferred_payment_method: preferredMethod,
    preferredPaymentMethod: preferredMethod,
    preferred_payment_account: preferredAccount,
    preferredPaymentAccount: preferredAccount,
    responsavel: billingContact,
    billing_contact_name: billingContact,
    payer_aliases_json: serializePayerAliases(payerAliases),
    payerAliases,
    billing_enabled: billingEnabled,
    academy_id: agencyId,
    academyId: agencyId,
    agencyId,
    lead_id: id,
    student_id: id,
    is_student: billingEnabled,
    origin: 'client',
    raw: client,
  };
}

/**
 * Converte patch camelCase do módulo Nave → campos persistidos no Client (payload).
 */
export function studentUpdatesToClientPatch(updates = {}) {
  const patch = {};
  const u = updates || {};

  if (u.preferredPaymentMethod !== undefined || u.preferred_payment_method !== undefined) {
    patch.preferred_payment_method = String(
      u.preferredPaymentMethod ?? u.preferred_payment_method ?? ''
    ).trim();
  }
  if (u.preferredPaymentAccount !== undefined || u.preferred_payment_account !== undefined) {
    patch.preferred_payment_account = String(
      u.preferredPaymentAccount ?? u.preferred_payment_account ?? ''
    )
      .trim()
      .slice(0, 128);
  }
  if (u.dueDay !== undefined || u.due_day !== undefined) {
    const n = Number(u.dueDay ?? u.due_day);
    if (Number.isFinite(n) && n >= 1 && n <= 31) patch.due_day = Math.trunc(n);
  }
  if (u.plan !== undefined) patch.plan = String(u.plan || '').trim();
  if (u.planPrice !== undefined || u.plan_price !== undefined) {
    const n = Number(u.planPrice ?? u.plan_price);
    patch.plan_price = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  }
  if (u.discountAmount !== undefined || u.discount_amount !== undefined) {
    const n = Number(u.discountAmount ?? u.discount_amount);
    patch.discount_amount = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  }
  if (u.billing_enabled !== undefined || u.billingEnabled !== undefined) {
    patch.billing_enabled = Boolean(u.billing_enabled ?? u.billingEnabled);
  }
  if (u.billing_contact_name !== undefined || u.billingContactName !== undefined) {
    patch.billing_contact_name = String(
      u.billing_contact_name ?? u.billingContactName ?? ''
    ).trim();
  }
  if (u.responsavel !== undefined) {
    patch.billing_contact_name = String(u.responsavel || '').trim();
  }
  if (u.payerAliases !== undefined || u.payer_aliases_json !== undefined) {
    patch.payer_aliases_json =
      typeof u.payer_aliases_json === 'string'
        ? u.payer_aliases_json
        : serializePayerAliases(u.payerAliases);
  }

  return patch;
}
