/**
 * Stub de contratos digitais (Autentique) — Evocto não inclui esse módulo.
 * Mantém a API que `useFinanceConfigState` espera.
 */

export function useContractTemplates(_activeOnly = false) {
  return {
    data: { templates: [], configured: false },
    isSuccess: true,
    isLoading: false,
    error: null,
  };
}

export function useEnsureAcademyContractSetup() {
  return {
    mutateAsync: async () => ({ ok: true, templates: [] }),
    mutate: () => {},
    isPending: false,
    isError: false,
  };
}

export function useContractsList() {
  return { data: { data: [] }, isLoading: false, isSuccess: true };
}

export function useContractDetail() {
  return { data: null, isLoading: false };
}

export function useCancelContract() {
  return { mutateAsync: async () => ({}), isPending: false };
}

export function useCreateContractTemplate() {
  return { mutateAsync: async () => ({}), isPending: false };
}

export function useUpdateContractTemplate() {
  return { mutateAsync: async () => ({}), isPending: false };
}

export function useContractAutentiqueMeta() {
  return { data: null, isSuccess: true };
}
