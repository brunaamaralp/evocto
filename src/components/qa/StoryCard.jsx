import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, ListChecks, ClipboardList } from "lucide-react";

const colorByPriority = {
  P1: "bg-red-100 text-red-700 border-red-300",
  P2: "bg-amber-100 text-amber-700 border-amber-300",
  P3: "bg-blue-100 text-blue-700 border-blue-300"
};

const colorByStatus = {
  planned: "bg-slate-100 text-slate-700 border-slate-300",
  in_progress: "bg-blue-100 text-blue-700 border-blue-300",
  passed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  failed: "bg-red-100 text-red-700 border-red-300"
};

export default function StoryCard({ story, onUpdate }) {
  const [open, setOpen] = useState(false);

  const handleMark = async (newStatus) => {
    await onUpdate(story, newStatus);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-slate-900">{story.title}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className={colorByPriority[story.priority] || ""}>{story.priority}</Badge>
              <Badge className={colorByStatus[story.status] || ""}>{story.status.replace("_", " ")}</Badge>
              <Badge variant="outline">{story.area}</Badge>
              <Badge variant="outline">Role: {story.role}</Badge>
              {story.tags?.slice(0, 3).map((t, i) => (
                <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
              {open ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />} Detalhes
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleMark("passed")}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Pass
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleMark("failed")}>
              <XCircle className="w-4 h-4 mr-1" /> Fail
            </Button>
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-slate-700 font-medium mb-2">
              <ListChecks className="w-4 h-4" /> Critérios de Aceitação
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              {(story.acceptanceCriteria || []).map((c, idx) => <li key={idx}>{c}</li>)}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 text-slate-700 font-medium mb-2">
              <ClipboardList className="w-4 h-4" /> Passos de Teste (E2E)
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-slate-700">
              {(story.steps || []).map((s, idx) => <li key={idx}>{s}</li>)}
            </ol>
          </div>
          {story.notes && (
            <div className="text-sm text-slate-600">
              <strong>Notas:</strong> {story.notes}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}