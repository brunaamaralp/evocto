import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Play, RefreshCw, Activity, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAgentStatus } from '@/api/functions';
import { executeAgent } from '@/api/functions';

export default function AgentsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState({});
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [running, setRunning] = useState({}); // por agente

  const loadStatus = async () => {
    setLoading(true);
    const { data } = await getAgentStatus();
    setAgents(data?.agentsStatus || {});
    setSystemMetrics(data?.systemMetrics || null);
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 15000);
    return () => clearInterval(id);
  }, []);

  const list = useMemo(() => Object.entries(agents), [agents]);

  const handleRun = async (agentId) => {
    setRunning(prev => ({ ...prev, [agentId]: true }));
    try {
      const { data } = await executeAgent({ agentId });
      if (data?.success) {
        // sucesso, recarregar status
        await loadStatus();
      }
    } finally {
      setRunning(prev => ({ ...prev, [agentId]: false }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Central de Agentes</h1>
          <p className="text-slate-600">Monitore e execute agentes de IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStatus} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>
      </div>

      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-xs text-slate-500">Execuções</div>
                <div className="text-lg font-semibold">{systemMetrics.totalExecutions || 0}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-xs text-slate-500">Taxa de Sucesso</div>
                <div className="text-lg font-semibold">{Math.round(systemMetrics.successRate || 0)}%</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-600" />
              <div>
                <div className="text-xs text-slate-500">Tempo Médio</div>
                <div className="text-lg font-semibold">{Math.round((systemMetrics.avgExecutionTime || 0)/1000)}s</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <Card><CardContent className="p-6">Carregando status dos agentes...</CardContent></Card>
        ) : list.length === 0 ? (
          <Card><CardContent className="p-6">Nenhum agente encontrado.</CardContent></Card>
        ) : (
          list.map(([agentId, cfg]) => (
            <Card key={agentId} className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{cfg.icon || '🤖'}</span>
                    {cfg.name || agentId}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {cfg.enabled ? 'Ativo' : 'Desativado'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">{cfg.description}</p>

                <div className="text-xs text-slate-500">
                  Próxima execução: {cfg.nextExecution ? new Date(cfg.nextExecution).toLocaleString() : 'Sob demanda'}
                </div>

                {cfg.lastExecution ? (
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    {cfg.lastExecution.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : cfg.lastExecution.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-600" />
                    )}
                    Última: {new Date(cfg.lastExecution.startedAt).toLocaleString()}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Sem execuções anteriores</div>
                )}

                <div className="flex justify-end">
                  <Button
                    className="gap-2"
                    onClick={() => handleRun(agentId)}
                    disabled={running[agentId]}
                  >
                    <Play className="w-4 h-4" />
                    {running[agentId] ? 'Executando...' : 'Rodar agora'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}