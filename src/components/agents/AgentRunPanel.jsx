import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { executeAgent } from "@/api/functions";
import { toast } from "sonner";
import { Brain, RefreshCw, CheckCircle, AlertCircle, Play } from "lucide-react";

const AGENTS = [
  { id: "health_monitor", name: "Health Monitor", desc: "Verifica sinais de risco nos serviços" },
  { id: "cycle_planner", name: "Cycle Planner", desc: "Gera planos de ciclo com base em aprendizados" },
  { id: "smart_recommendations", name: "Smart Recommender", desc: "Gera recomendações inteligentes" },
  { id: "task_learning_extractor", name: "Learning Extractor", desc: "Extrai aprendizados a partir de tarefas" }
];

export default function AgentRunPanel({ onAfterRun }) {
  const [running, setRunning] = React.useState({});
  const [results, setResults] = React.useState({});

  const runAgent = async (agentId) => {
    setRunning((s) => ({ ...s, [agentId]: true }));
    try {
      const { data, status } = await executeAgent({ agentId });
      if (status !== 200) {
        throw new Error("Falha ao executar agente");
      }
      if (data?.success) {
        toast.success(`Agente ${agentId} executado com sucesso`);
        setResults((r) => ({
          ...r,
          [agentId]: { ok: true, executionId: data.executionId, message: "Concluído" }
        }));
      } else {
        toast.error(data?.error || "Agente retornou erro");
        setResults((r) => ({
          ...r,
          [agentId]: { ok: false, executionId: data?.executionId, message: data?.error || "Erro" }
        }));
      }
      onAfterRun && onAfterRun();
    } catch (e) {
      toast.error(e.message || "Erro ao executar agente");
      setResults((r) => ({
        ...r,
        [agentId]: { ok: false, executionId: null, message: e.message || "Erro" }
      }));
    } finally {
      setRunning((s) => ({ ...s, [agentId]: false }));
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Rodar Agentes Agora
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {AGENTS.map((a) => {
          const res = results[a.id];
          return (
            <div key={a.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-slate-900">{a.name}</div>
                {res ? (
                  res.ok ? (
                    <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">Erro</Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-slate-600">Pronto</Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 mb-3">{a.desc}</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => runAgent(a.id)}
                  disabled={!!running[a.id]}
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  {running[a.id] ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Executando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" /> Rodar agora
                    </>
                  )}
                </Button>
                {res && (
                  <div className="flex items-center text-xs">
                    {res.ok ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 mr-1" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 mr-1" />
                    )}
                    <span className="text-slate-700">
                      {res.message}
                      {res.executionId ? ` • ${res.executionId.slice(0, 10)}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}