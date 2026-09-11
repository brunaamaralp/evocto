/**
 * @deprecated Prefer /client-portal pending actions via overview API.
 * Secure wrapper: no direct Task/ApprovalRequest entity queries.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckSquare, Clock, Loader2 } from 'lucide-react';
import { getClientPendingActions } from '@/lib/clientPortalApi';
import { Link } from 'react-router-dom';

export default function ClientPendingActions({ onActionComplete: _onActionComplete }) {
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPendingActions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getClientPendingActions();
      const actions = [];

      (data.approvals || []).forEach((approval) => {
        actions.push({
          id: approval.id,
          type: 'approval',
          title: approval.title || 'Aprovação Pendente',
          description: approval.description,
          dueDate: approval.expiresAt,
          href: '/client-portal?tab=approvals',
        });
      });

      (data.sharedTasksNeedingAttention || []).forEach((task) => {
        actions.push({
          id: task.id,
          type: 'shared',
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          href: '/client-portal?tab=shared',
        });
      });

      setPendingActions(actions);
    } catch (error) {
      console.error('Erro ao carregar ações pendentes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingActions();
  }, [loadPendingActions]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Pendências
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!pendingActions.length ? (
          <p className="text-sm text-gray-500">Nada pendente no momento.</p>
        ) : (
          pendingActions.map((action) => (
            <div
              key={`${action.type}-${action.id}`}
              className="flex items-start justify-between gap-2 rounded-md border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {action.type === 'approval' ? (
                    <CheckSquare className="w-4 h-4 text-orange-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <p className="text-sm font-medium truncate">{action.title}</p>
                </div>
                {action.description ? (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{action.description}</p>
                ) : null}
                <Badge variant="secondary" className="mt-2 text-xs capitalize">
                  {action.type === 'approval' ? 'Aprovação' : 'Compartilhado'}
                </Badge>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={action.href}>Abrir</Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
