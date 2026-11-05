import { useState, useEffect, useCallback, useMemo } from 'react';
import { Client, Task, ClientDocument, LearningEntry } from '@/api/entities';
import { listClientAccesses } from '@/lib/clientAccessesApi';

async function safeFilter(entity, filters, order) {
  try {
    const result = order != null
      ? await entity.filter(filters, order)
      : await entity.filter(filters);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.warn('[useClientHubData] filter failed:', error?.message || error);
    return [];
  }
}

function dedupeById(items = []) {
  const map = new Map();
  for (const item of items) {
    if (item?.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}

/**
 * Loader da visão geral do cliente: cliente, tarefas e informações
 * (documentos, aprendizados, acessos). Entidades sem tabela retornam [].
 */
export default function useClientHubData(clientId, agencyId) {
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [learnings, setLearnings] = useState([]);
  const [accesses, setAccesses] = useState([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!clientId || !agencyId) {
      setLoading(false);
      setError(!clientId ? 'ID do cliente não encontrado na URL' : 'Agency ID não encontrado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const clientData = await Client.get(clientId);
      if (!clientData || clientData.agencyId !== agencyId) {
        setClient(null);
        setAccesses([]);
        setGeneralNotes('');
        setError(
          clientData ? 'Cliente não encontrado ou sem permissão de acesso' : 'Cliente não encontrado'
        );
        return;
      }

      const [tasksData, documentsData, learningsByProject, learningsByClient, accessesPayload] =
        await Promise.all([
          safeFilter(Task, { agencyId, clientId }),
          safeFilter(ClientDocument, { agencyId, clientId }, '-created_date'),
          // Aprendizados: legado usa projectId === clientId; schema novo também indexa clientId
          safeFilter(LearningEntry, { agencyId, projectId: clientId }, '-created_date'),
          safeFilter(LearningEntry, { agencyId, clientId }, '-created_date'),
          listClientAccesses(clientId).catch((err) => {
            console.warn('[useClientHubData] accesses', err?.code || err?.message || err);
            return { accesses: [], generalNotes: '' };
          }),
        ]);

      setClient(clientData);
      setTasks(tasksData);
      setDocuments(documentsData);
      setLearnings(dedupeById([...learningsByProject, ...learningsByClient]));
      setAccesses(Array.isArray(accessesPayload?.accesses) ? accessesPayload.accesses : []);
      setGeneralNotes(String(accessesPayload?.generalNotes || ''));
    } catch (err) {
      console.error('[useClientHubData]', err);
      setError(err.message || 'Erro ao carregar cliente');
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const counts = useMemo(
    () => ({ documents: documents.length, learnings: learnings.length }),
    [documents, learnings]
  );

  return {
    client,
    tasks,
    documents,
    learnings,
    accesses,
    generalNotes,
    loading,
    error,
    reload,
    counts,
  };
}
