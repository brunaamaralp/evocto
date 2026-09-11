/**
 * @deprecated Use /client-portal approvals tab + clientPortalApi.
 * Kept as a thin secure wrapper so accidental imports do not query Appwrite directly.
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  listClientApprovals,
  decideClientApproval,
  getClientApprovalDetail,
} from '@/lib/clientPortalApi';

export default function ApprovalsView({ onApprovalComplete }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listClientApprovals();
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar aprovações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (approval) => {
    setSelectedId(approval.id);
    setComment('');
    setPreview(null);
    try {
      const detail = await getClientApprovalDetail(approval.id);
      setPreview(detail.contentPreview || null);
    } catch {
      setPreview(null);
    }
  };

  const decide = async (action) => {
    if (!selectedId) return;
    if (action === 'reject' && !comment.trim()) {
      toast.error('Comentário obrigatório para solicitar ajustes');
      return;
    }
    setSubmitting(true);
    try {
      await decideClientApproval({
        approvalId: selectedId,
        action,
        comment: comment.trim(),
      });
      toast.success(action === 'approve' ? 'Aprovado' : 'Ajustes solicitados');
      setSelectedId(null);
      await load();
      onApprovalComplete?.();
    } catch (error) {
      toast.error(error.message || 'Falha ao processar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!approvals.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-gray-600">
          Nenhuma aprovação pendente.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {approvals.map((a) => (
        <Card key={a.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{a.title}</h3>
                {a.description ? (
                  <p className="text-sm text-gray-600 mt-1">{a.description}</p>
                ) : null}
                <Badge className="mt-2" variant="secondary">
                  Pendente
                </Badge>
              </div>
              <Button size="sm" variant="outline" onClick={() => open(a)}>
                Revisar
              </Button>
            </div>

            {selectedId === a.id ? (
              <div className="space-y-3 border-t pt-3">
                {preview ? (
                  <div className="rounded-md bg-slate-50 p-3 text-sm">
                    <p className="font-medium">{preview.title}</p>
                    {preview.summary ? (
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap">{preview.summary}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Sem preview detalhado
                  </p>
                )}
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comentário"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => decide('approve')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button
                    disabled={submitting}
                    variant="outline"
                    onClick={() => decide('reject')}
                  >
                    Solicitar ajustes
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
