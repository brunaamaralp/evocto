import React, { useEffect, useState, useCallback } from "react";
import { LearningEntry } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TriageTable from "@/components/learnings/TriageTable";
import LearningIngestor from "@/components/learnings/LearningIngestor";
import { Button } from "@/components/ui/button";

export default function LearningsManagerPage() {
  const [items, setItems] = useState([]);
  const [confidenceMin, setConfidenceMin] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await LearningEntry.filter({}, "-updated_date", 200);
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onToggleShare = async (l, v) => {
    await LearningEntry.update(l.id, { isShared: !!v });
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Aprendizados • Triagem</h1>
        <Button variant="outline" onClick={load}>Recarregar</Button>
      </div>

      <LearningIngestor onCreated={load} />

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Itens ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="text-slate-600">Carregando...</div> : (
            <TriageTable
              items={items}
              confidenceMin={confidenceMin}
              onConfidenceMinChange={setConfidenceMin}
              onToggleShare={onToggleShare}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}