import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";
import { goldenPathE2E } from "@/api/functions";

export default function E2EGoldenPathPage() {
  const [running, setRunning] = React.useState(false);
  const [report, setReport] = React.useState(null);
  const [error, setError] = React.useState("");

  const run = async () => {
    setRunning(true);
    setError("");
    setReport(null);
    try {
      const { data, status } = await goldenPathE2E({});
      if (status !== 200 || !data?.success) {
        setError(data?.error || "Falha ao executar E2E");
      } else {
        setReport(data);
      }
    } catch (e) {
      setError("Erro ao comunicar com o runner E2E.");
    } finally {
      setRunning(false);
    }
  };

  const downloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `e2e-golden-path-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  const statusIcon = (s) => {
    if (s === 'ok') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (s === 'warn') return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    return <XCircle className="w-4 h-4 text-rose-600" />;
    };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>E2E Runner — Golden Path</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Executa o caminho dourado: gera tarefas na ativação do serviço, cria/edita tarefa extra, anexa arquivo, sinaliza evento de KPI, promove deliverable para revisão e prepara estado do briefing para testes de UI.
            </p>
            <div className="flex gap-3">
              <Button onClick={run} disabled={running} className="gap-2">
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {running ? "Executando..." : "Executar E2E"}
              </Button>
              <Button variant="outline" onClick={downloadJSON} disabled={!report} className="gap-2">
                <Download className="w-4 h-4" /> Baixar JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {running && (
          <Card>
            <CardHeader>
              <CardTitle>Progresso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 w-full loading-skeleton rounded" />
                <div className="h-4 w-5/6 loading-skeleton rounded" />
                <div className="h-4 w-2/3 loading-skeleton rounded" />
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardHeader>
              <CardTitle className="text-rose-600">Erro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {report && (
          <Card>
            <CardHeader>
              <CardTitle>Relatório</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 mb-2">Tempo total: <strong>{report.totalMs}ms</strong></div>
              <ul className="space-y-3">
                {report.steps?.map((s, idx) => (
                  <li key={idx} className="border rounded p-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(s.status)}
                      <span className="font-medium">{s.name}</span>
                      {s.duration ? <span className="text-xs ml-2 text-gray-500">{s.duration}</span> : null}
                    </div>
                    {s.evidence ? (
                      <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(s.evidence, null, 2)}</pre>
                    ) : null}
                    {'sla_check_lt_2s' in s ? (
                      <div className="mt-1 text-xs">
                        SLA (&lt;2s): <strong className={s.sla_check_lt_2s ? "text-green-600" : "text-rose-600"}>
                          {s.sla_check_lt_2s ? "OK" : "FALHOU"}
                        </strong>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}