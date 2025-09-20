import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UploadFile } from "@/api/integrations";
import { LearningEntry } from "@/api/entities";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";

export default function LearningIngestor({ onCreated }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");

  const ingest = async () => {
    if (!file) return;
    setBusy(true);
    setOk("");
    try {
      const { file_url } = await UploadFile({ file });
      const learning = await LearningEntry.create({
        agencyId: undefined, // backend preenche via RLS (user.agencyId)
        status: "ready",
        sourceType: "auto_upload",
        sourceRef: file_url,
        fileUrl: file_url,
        title: title || file.name,
        description: "Arquivo carregado pela agência",
        isShared: false,
        confidence_score: 50,
        tags: ["upload"]
      });
      onCreated && onCreated(learning);
      setOk("Arquivo ingerido com sucesso.");
      setFile(null);
      setTitle("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-2">
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Input placeholder="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button onClick={ingest} disabled={!file || busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Ingerir Aprendizado
          </Button>
        </div>
        {ok && <div className="text-green-600 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {ok}</div>}
      </CardContent>
    </Card>
  );
}