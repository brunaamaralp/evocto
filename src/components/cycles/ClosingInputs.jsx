import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileUp, Link2, BrainCircuit, Loader2 } from 'lucide-react';

export default function ClosingInputs({ onProcess, loading }) {
  const [attachments, setAttachments] = useState([]);
  const [notes, setNotes] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handleSubmit = () => {
    onProcess({ attachments, notes });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Insumos do Fechamento</CardTitle>
        <CardDescription>
          Faça upload de relatórios, transcrições de reuniões ou adicione notas para a IA analisar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Relatórios, Transcrições, etc.</Label>
          <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg">
            <FileUp className="w-8 h-8 text-slate-400" />
            <div className="flex-1">
              <Input id="file-upload" type="file" multiple onChange={handleFileChange} className="hidden" />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Selecionar arquivos
                </label>
              </Button>
              <p className="text-xs text-slate-500 mt-1">
                {attachments.length > 0 ? `${attachments.length} arquivo(s) selecionado(s)` : 'Arraste e solte ou clique para selecionar.'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas e Contexto Adicional</Label>
          <Textarea
            id="notes"
            placeholder="Cole aqui transcrições, notas da reunião de feedback, ou qualquer contexto relevante..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading || (attachments.length === 0 && !notes.trim())} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando com IA...
            </>
          ) : (
            <>
              <BrainCircuit className="w-4 h-4 mr-2" />
              Analisar e Gerar Sugestões
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}