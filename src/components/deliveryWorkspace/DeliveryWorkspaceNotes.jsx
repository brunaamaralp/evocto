import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Service } from '@/api/entities';
import { toast } from 'sonner';

const NOTE_TYPES = [
  { value: 'note', label: 'Nota' },
  { value: 'internal', label: 'Interna' },
  { value: 'client_request', label: 'Pedido do cliente' },
  { value: 'revision', label: 'Revisão' },
];

export default function DeliveryWorkspaceNotes({ service, onServiceUpdated }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('note');
  const [saving, setSaving] = useState(false);

  const notes = Array.isArray(service?.workspace_notes) ? service.workspace_notes : [];

  const handleAdd = async () => {
    const body = text.trim();
    if (!body || !service?.id) return;
    setSaving(true);
    try {
      const entry = {
        id: `note_${Date.now()}`,
        type,
        body,
        created_at: new Date().toISOString(),
      };
      const next = [entry, ...notes];
      await Service.update(service.id, { workspace_notes: next });
      setText('');
      toast.success('Nota adicionada');
      onServiceUpdated?.({ ...service, workspace_notes: next });
    } catch (err) {
      toast.error(err?.message || 'Falha ao salvar nota');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Nova nota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Registre uma observação da entrega…"
            rows={3}
          />
          <Button onClick={handleAdd} disabled={saving || !text.trim()}>
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma nota ainda.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {NOTE_TYPES.find((t) => t.value === n.type)?.label || n.type}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {n.created_at
                        ? new Date(n.created_at).toLocaleString('pt-BR')
                        : ''}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
