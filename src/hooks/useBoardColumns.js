import { useCallback, useEffect, useState } from 'react';
import { Agency, Client } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { normalizeBoardColumns, resolveBoardColumns } from '@/lib/boardColumns';

const UPDATED_EVENT = 'board-columns:updated';

/**
 * Colunas do quadro: do cliente (se tiver), senão da agência, senão padrão.
 * @param {{ clientId?: string|null }} [opts] sem clientId = quadro geral da agência
 */
export default function useBoardColumns({ clientId = null } = {}) {
  const { agencyId } = useSession();
  const [agency, setAgency] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    try {
      const [agencyRow, clientRow] = await Promise.all([
        Agency.get(agencyId).catch(() => null),
        clientId ? Client.get(clientId).catch(() => null) : Promise.resolve(null),
      ]);
      setAgency(agencyRow);
      setClient(clientRow);
    } finally {
      setLoading(false);
    }
  }, [agencyId, clientId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onUpdated = () => load();
    window.addEventListener(UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(UPDATED_EVENT, onUpdated);
  }, [load]);

  const { columns, source } = resolveBoardColumns({ agency, client });
  const agencyColumns = resolveBoardColumns({ agency }).columns;

  /**
   * @param {object[]} next colunas editadas
   * @param {'agency'|'client'} scope onde salvar
   */
  const saveColumns = useCallback(
    async (next, scope) => {
      const normalized = normalizeBoardColumns(next);
      if (!normalized) throw new Error('O quadro precisa de pelo menos uma coluna.');
      if (scope === 'client') {
        if (!clientId) throw new Error('Cliente não informado');
        const updated = await Client.update(clientId, { board_columns: normalized });
        setClient(updated);
      } else {
        if (!agencyId) throw new Error('Agência não encontrada');
        const updated = await Agency.update(agencyId, { board_columns: normalized });
        setAgency(updated);
      }
      window.dispatchEvent(new Event(UPDATED_EVENT));
      return normalized;
    },
    [agencyId, clientId]
  );

  /** Cliente volta a usar as colunas da agência. */
  const resetClientColumns = useCallback(async () => {
    if (!clientId) return;
    const updated = await Client.update(clientId, { board_columns: null });
    setClient(updated);
    window.dispatchEvent(new Event(UPDATED_EVENT));
  }, [clientId]);

  return {
    columns,
    source,
    agencyColumns,
    loading,
    saveColumns,
    resetClientColumns,
    canUseClientScope: Boolean(clientId),
  };
}
