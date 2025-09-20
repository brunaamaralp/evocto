
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle2, XCircle, Clock, Link2, FileDown } from 'lucide-react';
import { approvalWorkflow } from '@/api/functions';
import { approvedPlanPdf } from '@/api/functions';

function useToken() {
  const [token, setToken] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setToken(p.get("token") || "");
  }, []);
  return token;
}

export default function PublicApprovalPage() {
  const token = useToken();
  const [loading, setLoading] = useState(true);
  const [approval, setApproval] = useState(null);
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [comment, setComment] = useState("");
  const [info, setInfo] = useState("");

  const state = useMemo(() => {
    if (!approval) return "loading"; // Default when approval object isn't loaded yet
    if (approval.status === "expired") return "expired";
    if (approval.status === "revoked") return "revoked";
    if (["approved", "rejected"].includes(approval.status)) return approval.status;
    return "pending";
  }, [approval]);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Token de aprovação não fornecido.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const { data, status } = await approvalWorkflow({ action: "validate", token });
      if (status === 200 && data?.success) {
        setApproval(data.approval);
      } else {
        setError(data?.error || "Link inválido ou não encontrado.");
        setApproval(null);
      }
    } catch (err) {
      console.error("Erro ao carregar aprovação:", err);
      setError("Erro ao carregar dados. Tente novamente.");
      setApproval(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const canSubmit = useMemo(() => {
    if (!approval || state !== "pending") return false;
    if (approval.requiresSignature && signature.trim().length < 3) return false;
    return true;
  }, [approval, state, signature]);

  const doAction = async (act) => {
    setError("");
    setInfo("");
    setLoading(true); // Set loading while processing action
    try {
      // First attempt with new structure
      const res1 = await approvalWorkflow({
        action: "process",
        token,
        actionType: act,
        signatureName: signature,
        comment
      });

      if (res1?.data?.success) {
        handleProcessResponse(res1);
      } else {
        // Fallback: if backend doesn't support actionType, try old 'action' field
        const res2 = await approvalWorkflow({
          action: act, // Old field name
          token,
          signatureName: signature,
          comment
        });
        handleProcessResponse(res2);
      }
    } catch (err) {
      console.error('Erro ao processar ação:', err);
      setError("Não foi possível processar sua ação. Tente novamente.");
    } finally {
      setLoading(false); // End loading regardless of success/failure
    }
  };

  const handleProcessResponse = ({ data, status }) => {
    if (status === 200 && data?.success) {
      setInfo(data.status === 'approved' ? "Aprovado com sucesso." : "Rejeitado com sucesso.");
      setApproval(data.approval); // Update approval state with new status and details
    } else {
      setError(data?.error || "Não foi possível processar sua ação.");
    }
  };

  const downloadPdf = async () => {
    setLoading(true); // Indicate loading for download
    setError("");
    try {
      const res = await approvedPlanPdf({ token });
      if (res?.status === 200 && res.data) {
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plano_aprovado_${approval?.title || 'documento'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setInfo("PDF baixado com sucesso!");
      } else {
        setError(res?.data?.error || "Falha ao baixar PDF.");
      }
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      setError("Erro ao baixar PDF. Tente novamente.");
    } finally {
      setLoading(false); // End loading after download attempt
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <Clock className="w-6 h-6 text-slate-500 mx-auto mb-2 animate-spin" />
            <p className="text-slate-600">Carregando link de aprovação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estados: inválido/404
  if (!approval && error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-0 shadow-sm">
          <CardContent className="p-6 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
            <h1 className="text-lg font-semibold">Link inválido</h1>
            <p className="text-slate-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-0 shadow-sm">
          <CardContent className="p-6 text-center space-y-2">
            <Clock className="w-8 h-8 text-amber-600 mx-auto" />
            <h1 className="text-lg font-semibold">Link expirado</h1>
            <p className="text-slate-600">O prazo desta aprovação terminou. Solicite um novo link à sua agência.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "revoked") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-0 shadow-sm">
          <CardContent className="p-6 text-center space-y-2">
            <XCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h1 className="text-lg font-semibold">Link revogado</h1>
            <p className="text-slate-600">Esta solicitação foi cancelada pela agência.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "approved" || state === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-0 shadow-sm">
          <CardContent className="p-6 text-center space-y-2">
            {state === "approved" ? (
              <>
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h1 className="text-lg font-semibold">Documento aprovado</h1>
                <p className="text-slate-600">Obrigado! Sua decisão foi registrada.</p>
                {approval?.pdfUrl && ( // Assuming pdfUrl on approval indicates a downloadable PDF
                    <Button variant="outline" className="mt-2 gap-2" onClick={downloadPdf} disabled={loading}>
                        <FileDown className="w-4 h-4" /> {loading ? "Baixando..." : "Baixar PDF aprovado"}
                    </Button>
                )}
              </>
            ) : (
              <>
                <XCircle className="w-8 h-8 text-red-600 mx-auto" />
                <h1 className="text-lg font-semibold">Documento rejeitado</h1>
                <p className="text-slate-600">Sua decisão foi registrada.</p>
              </>
            )}
            {approval?.approverComment && (
                <div className="bg-slate-50 rounded-lg p-3 text-left">
                    <p className="text-sm font-medium text-slate-700">Seu comentário:</p>
                    <p className="text-sm text-slate-600">{approval.approverComment}</p>
                </div>
            )}
            {approval?.processedAt && (
                <p className="text-xs text-slate-500">Processado em {new Date(approval.processedAt).toLocaleDateString('pt-BR')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // PENDENTE
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-purple-50">
      <Card className="max-w-lg w-full shadow-lg rounded-lg">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-1">
            <Link2 className="w-6 h-6 text-slate-500 mx-auto" />
            <h1 className="text-xl font-semibold text-slate-800">Revisar e Aprovar</h1>
            <p className="text-slate-600">Por favor, revise o documento e selecione sua ação.</p>
            <h2 className="text-2xl font-bold text-blue-700 mt-4">{approval?.title || "Documento para Aprovação"}</h2>
            <p className="text-sm text-slate-500">{approval?.description || "Revise o conteúdo abaixo."}</p>
            {approval?.pdfUrl && (
                <Button variant="outline" className="mt-4 gap-2" asChild>
                    <a href={approval.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <FileDown className="w-4 h-4" /> Visualizar PDF
                    </a>
                </Button>
            )}
          </div>

          {approval?.requiresSignature && (
            <div>
              <label htmlFor="signature" className="text-sm text-slate-700 font-medium">Assinatura (nome completo)</label>
              <Input
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Digite seu nome completo"
                className="mt-1"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">Obrigatório para concluir a aprovação.</p>
            </div>
          )}

          <div>
            <label htmlFor="comment" className="text-sm text-slate-700 font-medium">Comentário (opcional)</label>
            <Input
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Adicione suas observações"
              className="mt-1"
              disabled={loading}
            />
          </div>

          {info && <p className="text-sm text-emerald-700 text-center">{info}</p>}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => doAction('reject')}
              disabled={!canSubmit || loading}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              {loading ? "Processando..." : "Rejeitar"}
            </Button>
            <Button
              onClick={() => doAction('approve')}
              disabled={!canSubmit || loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Processando..." : "Aprovar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
