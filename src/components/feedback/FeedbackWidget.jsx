import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Bug, Lightbulb, ThumbsUp, Upload, Send } from "lucide-react";
import { UploadFile } from "@/api/integrations";
import { UserFeedback } from "@/api/entities";
import { useSession } from "@/components/auth/SessionManager";
import { toast } from "sonner";

export default function FeedbackWidget() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  const [severity, setSeverity] = useState("medium");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const page = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
  const browserInfo = useMemo(() => ({
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
    viewport: { w: typeof window !== "undefined" ? window.innerWidth : null, h: typeof window !== "undefined" ? window.innerHeight : null }
  }), []);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Descreva seu feedback");
      return;
    }
    setSubmitting(true);
    try {
      let attachmentUrl = "";
      if (file) {
        const { file_url } = await UploadFile({ file });
        attachmentUrl = file_url || "";
      }
      const payload = {
        agencyId: user?.agencyId,
        userId: user?.id || null,
        page,
        category,
        severity,
        message,
        attachmentUrl: attachmentUrl || undefined,
        browserInfo
      };
      await UserFeedback.create(payload);
      toast.success("Feedback enviado. Obrigado!");
      setOpen(false);
      setMessage("");
      setFile(null);
      setCategory("bug");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível enviar agora.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        aria-label="Enviar feedback"
        onClick={() => setOpen(true)}
        className="fixed z-40 bottom-6 right-6 rounded-full bg-slate-900 text-white shadow-lg hover:opacity-90 transition px-4 h-11 flex items-center gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        Feedback
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug"><span className="inline-flex items-center gap-2"><Bug className="w-3.5 h-3.5" />Bug</span></SelectItem>
                  <SelectItem value="idea"><span className="inline-flex items-center gap-2"><Lightbulb className="w-3.5 h-3.5" />Ideia</span></SelectItem>
                  <SelectItem value="suggestion">Sugestão</SelectItem>
                  <SelectItem value="praise"><span className="inline-flex items-center gap-2"><ThumbsUp className="w-3.5 h-3.5" />Elogio</span></SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue placeholder="Severidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder="Descreva seu feedback..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
                <Upload className="w-4 h-4" />
                <span>Anexar imagem (opcional)</span>
                <Input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              {file && <span className="text-xs text-slate-500 truncate max-w-[200px]">{file.name}</span>}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Enviando..." : <span className="inline-flex items-center gap-2"><Send className="w-4 h-4" />Enviar</span>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}