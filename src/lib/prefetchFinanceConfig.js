/**
 * Carrega financeConfig da agência (localStorage / store) — bridge Evocto.
 */
import { useLeadStore } from '../store/useLeadStore';

const defaultFinanceConfig = {
  cardFees: {},
  bankAccounts: [{ id: 'caixa', name: 'Caixa', active: true }],
  plans: [
    { id: 'recorrente', name: 'Recorrente mensal', price: 3500, active: true },
    { id: 'projeto', name: 'Projeto avulso', price: 0, active: true },
    { id: 'diagnostico', name: 'Diagnóstico', price: 4500, active: true, isExempt: false },
  ],
  captureMethods: [],
  feeReceivers: [],
  vendors: [],
  paymentMethods: {
    pix: { active: true },
    dinheiro: { active: true },
    credito: { active: true },
    debito: { active: true },
  },
  collectionRules: {},
};

export async function loadMergedFinanceConfigForAcademy(academyId) {
  const aid = String(academyId || '').trim();
  if (!aid) return defaultFinanceConfig;

  try {
    const raw = localStorage.getItem(`evocto.financeConfig.${aid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const cfg = { ...defaultFinanceConfig, ...parsed };
      useLeadStore.getState().setFinanceConfig(cfg, aid);
      return cfg;
    }
  } catch {
    /* ignore */
  }

  const fromStore = useLeadStore.getState().financeConfig;
  const cfg = { ...defaultFinanceConfig, ...(fromStore || {}) };
  useLeadStore.getState().setFinanceConfig(cfg, aid);
  return cfg;
}

export async function persistFinanceConfigForAcademy(academyId, cfg) {
  useLeadStore.getState().setFinanceConfig(cfg, academyId);
  return cfg;
}

/** Invalida cache e recarrega (compat Nave). */
export async function refreshFinanceConfigForAcademy(academyId) {
  return loadMergedFinanceConfigForAcademy(academyId);
}

export { defaultFinanceConfig };
