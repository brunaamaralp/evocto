import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { Task } from '@/api/entities';
import ActivityKindCoveragePanel from '@/components/debug/ActivityKindCoveragePanel';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Tags } from 'lucide-react';

const LOAD_LIMIT = 500;

/**
 * Diagnóstico admin — cobertura do contrato activityKind (V2.4).
 * Rota: /activity-kind-coverage
 * Não aparece na Home nem no portal do cliente.
 */
export default function ActivityKindCoveragePage() {
  const { agency, isAdmin, isOwner } = useSession();
  const agencyId = agency?.id || null;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await Task.filter({ agencyId }, '-updated_date', LOAD_LIMIT);
      setTasks(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('[activity-kind-coverage]', err);
      setError(err?.message || 'Falha ao carregar Tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin() && !isOwner()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Shield className="w-14 h-14 text-gray-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso negado</h2>
          <p className="text-gray-600 text-sm">
            Diagnóstico de activityKind é interno da agência (admin/owner).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tags className="w-7 h-7 text-gray-700" />
            Diagnóstico activityKind
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Observabilidade V2.4 — qualidade do dado antes do uso na Home operacional.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Relacionados:{' '}
            <Link className="underline" to="/system-health">
              system-health
            </Link>
            {' · '}
            <Link className="underline" to="/audit-report">
              audit-report
            </Link>
          </p>
        </div>

        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-800">{error}</CardContent>
          </Card>
        ) : null}

        <ActivityKindCoveragePanel
          tasks={tasks}
          agencyId={agencyId}
          loading={loading}
          universeLabel={`Até ${LOAD_LIMIT} Tasks da agência (ordenadas por updated_date)`}
          onRefresh={load}
        />
      </div>
    </div>
  );
}
