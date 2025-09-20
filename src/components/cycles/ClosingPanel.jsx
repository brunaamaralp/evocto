
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { UploadFile } from "@/api/integrations";
import { CyclePlan } from "@/api/entities";
import { AuditLog } from "@/api/entities";
import { FileUp, Save, CheckCircle2, AlertTriangle } from "lucide-react";

function useUrlId() {
  const [id, setId] = useState(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setId(p.get("id"));
  }, []);
  return id;
}

export default function ClosingPanel() {
  const id = useUrlId();
  const [plan, setPlan] = useState(null);
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const cp = await CyclePlan.get(id);
    setPlan(cp);
    setNotes(cp?.closing_notes || "");
    setAttachments(cp?.closing_attachments || []);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (evt) => {
    const files = Array.from(evt.target.files || []);
    if (!files.length) return;
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await UploadFile({ file });
        uploaded.push({
          name: file.name,
          url: file_url,
          type: file.type || "application/octet-stream",
          uploadedAt: new Date().toISOString()
        });
      }
      const newList = [...attachments, ...uploaded];
      await CyclePlan.update(plan.id, { closing_attachments: newList });
      setAttachments(newList);
      setInfo("Anexos enviados.");
    } catch (e) {
      setError(e?.message || "Falha ao enviar anexos");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!plan) return;
    setSaving(true);
    setError("");
    setInfo("");
    try {
      await CyclePlan.update(plan.id, { closing_notes: notes });
      setInfo("Notas salvas.");
    } catch (e) {
      setError(e?.message || "Falha ao salvar notas");
    } finally {
      setSaving(false);
    }
  };

  const moveToClosing = async () => {
    if (!plan) return;
    setSaving(true);
    setError("");
    setInfo("");
    try {
      await CyclePlan.update(plan.id, { status: "closing" });
      await AuditLog.create({
        agencyId: plan.agencyId,
        entity_type: "CyclePlan",
        entity_id: plan.id,
        action: "EVOLUTION_VIEWED",
        actor_id: "ui_cycle_closing",
        meta_json: { status: "closing", at: new Date().toISOString() }
      });
      setInfo("Ciclo movido para 'closing'.");
      await load();
    } catch (e) {
      setError(e?.message || "Falha ao mover para closing");
    } finally {
      setSaving(false);
    }
  };

  const finalizeCycle = async () => {
    if (!plan) return;
    setSaving(true);
    setError("");
    setInfo("");
    try {
      await CyclePlan.update(plan.id, { status: "completed" });
      await AuditLog.create({
        agencyId: plan.agencyId,
        entity_type: "CyclePlan",
        entity_id: plan.id,
        action: "EVOLUTION_EXPORTED", // Changed from "COMPLETED"
        actor_id: "ui_cycle_closing",
        meta_json: { closedAt: new Date().toISOString() }
      });
      setInfo("Ciclo finalizado com sucesso.");
      await load();
    } catch (e) {
      setError(e?.message || "Falha ao finalizar ciclo");
    } finally {
      setSaving(false);
    }
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
            <CheckCircle2 className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Fechamento do Ciclo</h3>
          </div>
          {plan?.status && (
            <Badge variant="outline" className="capitalize">
              {plan.status.replace("_"," ")}
            </Badge>
          )}
        </div>

        {/* Aviso de status e recomendação */}
        {plan?.status && !["closing", "completed"].includes(plan.status) && (
          <div className="p-3 rounded-md bg-amber-50 text-amber-700 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              Para finalizar, recomenda-se mover o ciclo para "closing" e anexar os documentos finais. Você pode concluir mesmo em "{plan.status}".
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Notas de Fechamento</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resumo dos resultados, lições aprendidas, próximos passos..." />
          <div className="flex gap-2">
            <Button onClick={saveNotes} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Notas"}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Anexos</label>
          <Input type="file" multiple onChange={handleUpload} />
          <div className="space-y-2">
            {attachments?.length ? attachments.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-slate-50">
                <div className="text-sm">
                  <a className="text-blue-600 underline" href={a.url} target="_blank" rel="noreferrer">{a.name}</a>
                  <div className="text-xs text-slate-500">{a.type} • {a.uploadedAt ? new Date(a.uploadedAt).toLocaleString('pt-BR') : ""}</div>
                </div>
              </div>
            )) : <p className="text-sm text-slate-600">Nenhum anexo enviado.</p>}
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button onClick={moveToClosing} disabled={saving || plan?.status === 'closing' || plan?.status === 'completed'} variant="outline" className="gap-2">
            <FileUp className="w-4 h-4" /> Mover para Closing
          </Button>
          <Button onClick={finalizeCycle} disabled={saving} className="gap-2">
            <CheckCircle2 className="w-4 h-4" /> {saving ? "Finalizando..." : "Finalizar Ciclo"}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-emerald-600">{info}</p>}
      </CardContent>
    </Card>
  );
}
