import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, CheckCircle, XCircle, Info, Settings,
  User, Building, Mail, Briefcase, FileText, Calendar,
  Plus, RefreshCw, Eye, ExternalLink
} from 'lucide-react';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import { Brief } from '@/api/entities';
import { BriefingVersion } from '@/api/entities';
import { User as UserEntity } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const DiagnosticItem = ({ icon: Icon, title, status, description, action, actionText, severity = 'info' }) => {
  const severityStyles = {
    error: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50', 
    success: 'border-emerald-200 bg-emerald-50',
    info: 'border-blue-200 bg-blue-50'
  };

  const iconStyles = {
    error: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-emerald-600', 
    info: 'text-blue-600'
  };

  return (
    <div className={`border rounded-lg p-4 ${severityStyles[severity]}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${iconStyles[severity]}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-900">{title}</h4>
            <Badge variant={
              status === 'ok' ? 'default' :
              status === 'warning' ? 'secondary' :
              status === 'error' ? 'destructive' : 'outline'
            }>
              {status === 'ok' ? 'OK' :
               status === 'warning' ? 'Atenção' :
               status === 'error' ? 'Erro' : 'Indefinido'}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
          {action && actionText && (
            <Button size="sm" variant="outline" onClick={action} className="mt-3">
              {actionText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const ClientDiagnostic = ({ clientId }) => {
  const { user, agencyId } = useSession();
  const [loading, setLoading] = useState(true);
  const [diagnosticData, setDiagnosticData] = useState({
    client: null,
    services: [],
    cycles: [],
    briefs: [],
    briefingVersions: [],
    clientUsers: []
  });
  const [diagnosticResults, setDiagnosticResults] = useState([]);

  const runDiagnostics = useCallback((data) => {
    const results = [];

    // 1. Verificar se cliente existe e tem dados básicos
    if (!data.client) {
      results.push({
        id: 'client-missing',
        icon: XCircle,
        title: 'Cliente não encontrado',
        status: 'error',
        description: 'O cliente não existe ou você não tem permissão para acessá-lo.',
        severity: 'error'
      });
    } else {
      // Verificar dados obrigatórios do cliente
      const missingFields = [];
      if (!data.client.name) missingFields.push('Nome');
      if (!data.client.email) missingFields.push('Email');
      if (!data.client.status) missingFields.push('Status');

      if (missingFields.length > 0) {
        results.push({
          id: 'client-incomplete',
          icon: AlertTriangle,
          title: 'Dados do cliente incompletos',
          status: 'warning',
          description: `Campos faltando: ${missingFields.join(', ')}`,
          severity: 'warning',
          action: () => window.location.href = createPageUrl('clients'),
          actionText: 'Editar Cliente'
        });
      } else {
        results.push({
          id: 'client-complete',
          icon: CheckCircle,
          title: 'Dados do cliente completos',
          status: 'ok',
          description: 'Todas as informações básicas do cliente estão preenchidas.',
          severity: 'success'
        });
      }
    }

    // 2. Verificar usuários cliente (login/acesso)
    if (data.clientUsers.length === 0) {
      results.push({
        id: 'client-user-missing',
        icon: User,
        title: 'Cliente não tem acesso ao sistema',
        status: 'warning',
        description: 'O cliente não foi convidado para acessar o portal. Ele não conseguirá ver briefings ou aprovar ciclos.',
        severity: 'warning',
        action: () => {
          // TODO: Implementar função de convite
          alert('Funcionalidade de convite será implementada');
        },
        actionText: 'Convidar Cliente'
      });
    } else {
      results.push({
        id: 'client-user-exists',
        icon: CheckCircle,
        title: 'Cliente tem acesso ao sistema',
        status: 'ok',
        description: `${data.clientUsers.length} usuário(s) cliente configurado(s).`,
        severity: 'success'
      });
    }

    // 3. Verificar serviços
    if (data.services.length === 0) {
      results.push({
        id: 'services-missing',
        icon: Briefcase,
        title: 'Nenhum serviço configurado',
        status: 'error',
        description: 'O cliente precisa ter pelo menos um serviço para gerar ciclos de trabalho.',
        severity: 'error',
        action: () => window.location.href = createPageUrl('service-editor') + `?clientId=${clientId}`,
        actionText: 'Criar Serviço'
      });
    } else {
      const activeServices = data.services.filter(s => s.is_active);
      if (activeServices.length === 0) {
        results.push({
          id: 'services-inactive',
          icon: AlertTriangle,
          title: 'Todos os serviços estão inativos',
          status: 'warning',
          description: `${data.services.length} serviço(s) criado(s), mas todos estão inativos.`,
          severity: 'warning',
          action: () => window.location.href = createPageUrl('services-overview'),
          actionText: 'Ativar Serviços'
        });
      } else {
        results.push({
          id: 'services-ok',
          icon: CheckCircle,
          title: 'Serviços configurados',
          status: 'ok',
          description: `${activeServices.length} serviço(s) ativo(s) de ${data.services.length} total.`,
          severity: 'success'
        });
      }
    }

    // 4. Verificar briefings
    if (data.briefs.length === 0) {
      results.push({
        id: 'briefing-missing',
        icon: FileText,
        title: 'Nenhum briefing criado',
        status: 'warning',
        description: 'O cliente não possui briefings. Isso pode afetar a qualidade dos ciclos gerados.',
        severity: 'warning',
        action: () => window.location.href = createPageUrl('briefing-editor') + `?clientId=${clientId}`,
        actionText: 'Criar Briefing'
      });
    } else {
      const completeBriefs = data.briefs.filter(b => b.status === 'READY');
      if (completeBriefs.length === 0) {
        results.push({
          id: 'briefing-incomplete',
          icon: AlertTriangle,
          title: 'Briefings incompletos',
          status: 'warning',
          description: `${data.briefs.length} briefing(s) criado(s), mas nenhum está finalizado.`,
          severity: 'warning',
          action: () => window.location.href = createPageUrl('briefing-editor') + `?clientId=${clientId}`,
          actionText: 'Finalizar Briefings'
        });
      } else {
        results.push({
          id: 'briefing-ok',
          icon: CheckCircle,
          title: 'Briefings completos',
          status: 'ok',
          description: `${completeBriefs.length} briefing(s) finalizado(s) de ${data.briefs.length} total.`,
          severity: 'success'
        });
      }
    }

    // 5. Verificar ciclos
    if (data.cycles.length === 0) {
      results.push({
        id: 'cycles-missing',
        icon: Calendar,
        title: 'Nenhum ciclo criado',
        status: 'info',
        description: 'O cliente ainda não possui ciclos de trabalho. Crie o primeiro ciclo para começar.',
        severity: 'info',
        action: () => window.location.href = createPageUrl('cycle-plan') + `?clientId=${clientId}`,
        actionText: 'Criar Primeiro Ciclo'
      });
    } else {
      const activeCycles = data.cycles.filter(c => ['approved', 'in_execution'].includes(c.status));
      results.push({
        id: 'cycles-ok',
        icon: CheckCircle,
        title: 'Ciclos de trabalho existem',
        status: 'ok',
        description: `${data.cycles.length} ciclo(s) total, ${activeCycles.length} ativo(s).`,
        severity: 'success'
      });
    }

    // 6. Verificar configurações de agência
    if (!agencyId) {
      results.push({
        id: 'agency-missing',
        icon: Building,
        title: 'Agência não identificada',
        status: 'error',
        description: 'Não foi possível identificar a agência. Verifique sua sessão.',
        severity: 'error'
      });
    }

    setDiagnosticResults(results);
  }, [agencyId, clientId]);

  const loadDiagnosticData = useCallback(async () => {
    if (!clientId || !agencyId) return;

    try {
      setLoading(true);
      
      // Carregar todos os dados relacionados ao cliente
      const [client, services, cycles, briefs, briefingVersions, allUsers] = await Promise.all([
        Client.get(clientId),
        Service.filter({ clientId }),
        CyclePlan.filter({ clientId }),
        Brief.filter({ projectId: clientId }), // Assumindo que projectId = clientId
        BriefingVersion.filter({ projectId: clientId }),
        UserEntity.filter({ agencyId, role: 'client' })
      ]);

      const clientUsers = allUsers.filter(u => u.clientId === clientId);

      const loadedData = {
        client,
        services: services || [],
        cycles: cycles || [],
        briefs: briefs || [],
        briefingVersions: briefingVersions || [],
        clientUsers: clientUsers || []
      };

      setDiagnosticData(loadedData);

      // Executar diagnósticos
      runDiagnostics(loadedData);

    } catch (error) {
      console.error('Erro no diagnóstico:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId, runDiagnostics]);

  useEffect(() => {
    loadDiagnosticData();
  }, [loadDiagnosticData]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Executando diagnóstico...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const errorCount = diagnosticResults.filter(r => r.status === 'error').length;
  const warningCount = diagnosticResults.filter(r => r.status === 'warning').length;
  const okCount = diagnosticResults.filter(r => r.status === 'ok').length;

  return (
    <div className="space-y-6">
      {/* Header com resumo */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Diagnóstico do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium">{errorCount} Erros</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-sm font-medium">{warningCount} Avisos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-sm font-medium">{okCount} OK</span>
            </div>
          </div>

          {errorCount > 0 && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Problemas críticos encontrados:</strong> O painel do cliente pode não funcionar corretamente até que os erros sejam corrigidos.
              </AlertDescription>
            </Alert>
          )}

          {errorCount === 0 && warningCount > 0 && (
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Algumas configurações podem ser melhoradas:</strong> O sistema funcionará, mas alguns recursos podem estar limitados.
              </AlertDescription>
            </Alert>
          )}

          {errorCount === 0 && warningCount === 0 && (
            <Alert className="mt-4 border-emerald-200 bg-emerald-50">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                <strong>Tudo configurado corretamente!</strong> O painel do cliente deve funcionar perfeitamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Lista de diagnósticos */}
      <div className="space-y-3">
        {diagnosticResults.map((result) => (
          <DiagnosticItem
            key={result.id}
            icon={result.icon}
            title={result.title}
            status={result.status}
            description={result.description}
            action={result.action}
            actionText={result.actionText}
            severity={result.severity}
          />
        ))}
      </div>

      {/* Dados carregados (para debug) */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-slate-700 mb-2">
          Dados Carregados (Debug)
        </summary>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <pre className="text-xs text-slate-600 whitespace-pre-wrap overflow-auto max-h-96">
              {JSON.stringify({
                clientExists: !!diagnosticData.client,
                clientData: diagnosticData.client ? {
                  id: diagnosticData.client.id,
                  name: diagnosticData.client.name,
                  email: diagnosticData.client.email,
                  status: diagnosticData.client.status,
                  agencyId: diagnosticData.client.agencyId
                } : null,
                servicesCount: diagnosticData.services.length,
                cyclesCount: diagnosticData.cycles.length,
                briefsCount: diagnosticData.briefs.length,
                clientUsersCount: diagnosticData.clientUsers.length,
                currentUser: {
                  id: user?.id,
                  email: user?.email,
                  role: user?.role,
                  agencyId: user?.agencyId
                }
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </details>
    </div>
  );
};

export default ClientDiagnostic;