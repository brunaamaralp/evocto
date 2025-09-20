import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CyclePlan } from "@/api/entities";
import { ApprovalRequest } from "@/api/entities";
import { Client } from "@/api/entities";
import { approvalWorkflow } from "@/api/functions";
import { Mail, Clock, ShieldCheck, Link2, Copy, RefreshCw, AlertTriangle } from "lucide-react";

function useUrlId() {
  const [id, setId] = useState(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setId(p.get("id"));
  }, []);
  return id;
}

export default function ApprovalActions() {
  const id = useUrlId();
  const [plan, setPlan] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approverEmail, setApproverEmail] = useState("");
  const [approverName, setApproverName] = useState("");
  const [message, setMessage] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);
  const [currentApproval, setCurrentApproval] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    setInfo("");
    const cp = await CyclePlan.get(id);
    setPlan(cp);
    if (cp?.clientId) {
      const cl = await Client.get(cp.clientId);
      setClient(cl);
    }
    // load pending approval if exists
    const approvals = await ApprovalRequest.filter({ contentType: "cycle_plan", contentId: id, status: "pending" }, "-created_date", 1);
    setCurrentApproval(approvals?.[0] || null);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!plan) return;
    setError("");
    setInfo("");
    const to = approverEmail || client?.email || "";
    if (!to) {
      setError("Informe o e-mail do aprovador.");
      return;
    }
    const payload = {
      action: "create",
      contentType: "cycle_plan",
      contentId: plan.id,
      approverEmail: to,
      approverName: approverName || client?.name || "",
      message,
      expiryDays: Number(expiryDays) || 7,
      requiresSignature: false
    };
    const { data, status } = await approvalWorkflow(payload);
    if (status !== 200 || !data?.success) {
      setError(data?.error || "Falha ao gerar link de aprovação.");
      return;
    }
    setInfo("Link de aprovação gerado com sucesso.");
    await load();
  };

  const resend = async () => {
    if (!currentApproval) return;
    setError("");
    setInfo("");
    const { data, status } = await approvalWorkflow({ action: "notify", approvalId: currentApproval.id, customMessage: message || "" });
    if (status !== 200 || !data?.success) {
      setError(data?.error || "Falha ao reenviar notificação.");
      return;
    }
    setInfo("Lembrete enviado.");
  };

  const copyLink = () => {
    if (!currentApproval) return;
    navigator.clipboard.writeText(`${currentApproval.approvalUrl || window.location.origin + "/approval/" + currentApproval.token}`);
    setInfo("Link copiado para a área de transferência.");
  };

  if (!id) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm text-slate-600">Informe o id do plano na URL (?id=...).</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Aprovação do Plano</h3>
          </div>
          {plan?.status && (
            <Badge variant="outline" className="capitalize">
              {plan.status.replace("_"," ")}
            </Badge>
          )}
        </div>

        {plan?.status && ["approved", "in_execution", "closing", "completed"].includes(plan.status) && (
          <div className="p-3 rounded-md bg-amber-50 text-amber-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              Este plano já foi aprovado e sua edição está bloqueada. Para mudanças, crie uma nova versão ou fale com seu gerente.
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>E-mail do aprovador</Label>
            <Input value={approverEmail} onChange={(e) => setApproverEmail(e.target.value)} placeholder={client?.email || "cliente@empresa.com"} />
          </div>
          <div className="space-y-2">
            <Label>Nome do aprovador</Label>
            <Input value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder={client?.name || "Nome do cliente"} />
          </div>
          <div className="space-y-2">
            <Label>Mensagem opcional</Label>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem que o cliente verá no e-mail" />
          </div>
          <div className="space-y-2">
            <Label>Expira em (dias)</Label>
            <Input type="number" min={1} value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={generate} className="gap-2">
            <Mail className="w-4 h-4" /> Enviar para Aprovação
          </Button>
          {currentApproval && (
            <>
              <Button variant="outline" onClick={resend} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Reenviar Lembrete
              </Button>
              <Button variant="outline" onClick={copyLink} className="gap-2">
                <Link2 className="w-4 h-4" /> Copiar Link
              </Button>
            </>
          )}
        </div>

        <Separator />

        {loading ? (
          <p className="text-slate-600 text-sm">Carregando informações...</p>
        ) : currentApproval ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>Expira em: {new Date(currentApproval.expiresAt).toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-slate-600" />
              <a
                className="text-blue-600 underline break-all"
                href={currentApproval.approvalUrl || (window.location.origin + "/approval/" + currentApproval.token)}
                target="_blank"
                rel="noreferrer"
              >
                {currentApproval.approvalUrl || (window.location.origin + "/approval/" + currentApproval.token)}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>Status: {currentApproval.status}</span>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 text-sm">Nenhuma aprovação pendente. Gere um link para solicitar aprovação ao cliente.</p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-emerald-600">{info}</p>}
      </CardContent>
    </Card>
  );
}