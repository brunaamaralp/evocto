/**
 * Bridge store: Nave useLeadStore → sessão/agência Evocto.
 * Expõe o mínimo que o hub financeiro precisa (academyId = agencyId).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const defaultFinanceConfig = {
  cardFees: {},
  bankAccounts: [{ id: 'caixa', name: 'Caixa', active: true }],
  plans: [
    { id: 'retainer', name: 'Retainer mensal', price: 0, active: true },
    { id: 'projeto', name: 'Projeto avulso', price: 0, active: true },
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
};

export const useLeadStore = create(
  persist(
    (set, get) => ({
      userId: null,
      academyId: null,
      academyList: [],
      modules: { finance: true },
      financeConfig: defaultFinanceConfig,
      leads: [],
      leadsById: {},

      /** Sincroniza a partir da sessão Evocto (chamar no hub financeiro). */
      syncFromSession(session) {
        const agencyId = session?.agencyId || session?.agency?.id || null;
        const userId = session?.userId || session?.user?.id || null;
        const agency = session?.agency || null;
        const list = agencyId
          ? [
              {
                id: agencyId,
                name: agency?.agencyName || agency?.name || session?.agencyName || 'Agência',
                ownerId: agency?.ownerId || (session?.isOwner?.() ? userId : ''),
                teamId: agency?.teamId || '',
                financeConfig: agency?.financeConfig || get().financeConfig,
              },
            ]
          : [];

        set({
          userId,
          academyId,
          academyList: list,
          modules: { finance: true, ...(agency?.modules || {}) },
        });
      },

      setAcademyId(academyId) {
        set({ academyId });
      },

      setFinanceConfig(financeConfig, academyId) {
        const cfg = financeConfig || defaultFinanceConfig;
        set((state) => {
          const aid = academyId || state.academyId;
          const academyList = (state.academyList || []).map((a) =>
            a.id === aid ? { ...a, financeConfig: cfg } : a
          );
          try {
            if (aid) {
              localStorage.setItem(
                `evocto.financeConfig.${aid}`,
                JSON.stringify(cfg)
              );
            }
          } catch {
            /* ignore */
          }
          return { financeConfig: cfg, academyList };
        });
      },

      getFinanceConfig() {
        return get().financeConfig || defaultFinanceConfig;
      },
    }),
    {
      name: 'evocto-finance-lead-bridge',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        academyId: s.academyId,
        financeConfig: s.financeConfig,
        modules: s.modules,
      }),
    }
  )
);

export default useLeadStore;
