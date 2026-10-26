import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CyclePlan, Client, Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle, Clock, FileText, Building2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import {
  canStaffMutateLegacyCycleApproval,
  resolveCycleApprovalEntryMode,
} from '@/lib/cycleApprovalLegacy';
import { createPageUrl } from '@/utils';

const LoadingState = () => (
  <div className="min-h-screen bg-[#EEF4FA] flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin mx-auto text-[#C02807] mb-4" />
      <h2 className="text-xl font-semibold text-[#18162A] mb-2">Carregando aprovação...</h2>
      <p className="text-[#7A7595]">Verificando dados do planejamento</p>
    </div>
  </div>
);

const ErrorState = ({ error, token }) => (
  <div className="min-h-screen bg-[#EEF4FA] flex items-center justify-center p-6">
    <Card className="max-w-md w-full rounded-2xl border-transparent shadow-sm">
      <CardHeader className="text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <CardTitle className="text-red-800">Erro ao Carregar Aprovação</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
        
        {token && (
          <div className="text-sm text-slate-600 bg-slate-100 p-3 rounded">
            <strong>Token:</strong> {token.slice(0, 20)}...
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-slate-600">Possíveis soluções:</p>
          <ul className="text-sm text-slate-500 space-y-1 text-left">
            <li>• Verifique se o link está correto e completo</li>
            <li>• O link pode ter expirado (válido por 7 dias)</li>
            <li>• Entre em contato com a agência para um novo link</li>
          </ul>
        </div>

        <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
          <AlertCircle className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </CardContent>
    </Card>
  </div>
);

const ExpiredState = ({ token }) => (
  <div className="min-h-screen bg-[#EEF4FA] flex items-center justify-center p-6">
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <Clock className="w-12 h-12 mx-auto text-orange-500 mb-4" />
        <CardTitle className="text-orange-800">Link de Aprovação Expirado</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertDescription className="text-orange-800">
            Este link de aprovação expirou. Links são válidos por 7 dias após o envio.
          </AlertDescription>
        </Alert>
        
        <div className="text-sm text-slate-600">
          <p className="mb-2">Para aprovar este planejamento:</p>
          <ul className="text-left space-y-1 text-slate-500">
            <li>1. Entre em contato com sua agência</li>
            <li>2. Solicite um novo link de aprovação</li>
            <li>3. O novo link chegará por email</li>
          </ul>
        </div>

        <div className="bg-slate-100 p-3 rounded text-xs text-slate-600">
          <strong>Token expirado:</strong> {token?.slice(0, 30)}...
        </div>
      </CardContent>
    </Card>
  </div>
);

const InvalidTokenState = ({ token }) => (
  <div className="min-h-screen bg-[#EEF4FA] flex items-center justify-center p-6">
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <CardTitle className="text-red-800">Link Inválido</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Este link de aprovação não é válido ou não existe.
          </AlertDescription>
        </Alert>
        
        <div className="text-sm text-slate-600">
          <p className="mb-2">Possíveis causas:</p>
          <ul className="text-left space-y-1 text-slate-500">
            <li>• Link copiado incorretamente</li>
            <li>• Aprovação já foi realizada</li>
            <li>• Link cancelado pela agência</li>
          </ul>
        </div>

        {token && (
          <div className="bg-slate-100 p-3 rounded text-xs text-slate-600">
            <strong>Token inválido:</strong> {token.slice(0, 30)}...
          </div>
        )}

        <p className="text-sm text-slate-600">
          Entre em contato com sua agência para obter um novo link.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default function CycleApprovalPage() {
  const { user, agencyId: sessionAgencyId, loading: sessionLoading } = useSession();
  const profile = user
    ? {
        role: user.role,
        agencyId: user.agencyId || user.data?.agencyId || sessionAgencyId,
      }
    : null;
  const [cyclePlan, setCyclePlan] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  const entry = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const tokenFromQuery = params.get('token');
    const pathTail = window.location.pathname.split('/').filter(Boolean).pop();
    const tokenFromPath =
      pathTail && pathTail !== 'cycle-approval' ? pathTail : null;
    return resolveCycleApprovalEntryMode({
      id,
      token: tokenFromQuery || tokenFromPath,
    });
  }, []);

  const canMutate = canStaffMutateLegacyCycleApproval(profile, cyclePlan);

  const loadApprovalData = useCallback(async () => {
    if (sessionLoading) return;

    if (entry.mode === 'invalid') {
      setError('Informe ?id= do ciclo (equipe) ou um token legado.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let cycle = null;
      if (entry.mode === 'staff_id') {
        cycle = await CyclePlan.get(entry.cycleId);
      } else {
        const cycles = await CyclePlan.filter({
          'approvalData.public_share_token': entry.token,
        });
        cycle = cycles?.[0] || null;
      }

      if (!cycle) {
        setError('Link de aprovação não encontrado. Verifique se o link está correto.');
        setLoading(false);
        return;
      }

      if (!canStaffMutateLegacyCycleApproval(profile, cycle)) {
        setError(
          'Fluxo legado restrito à equipe da agência. Clientes devem usar o portal ou o link moderno (/public-approval ou /review).'
        );
        setLoading(false);
        return;
      }

      if (cycle.status === 'approved' && cycle.approvalData?.approved_at) {
        setApproved(true);
      }

      if (cycle.approvalData?.token_expires_at) {
        const expiryDate = new Date(cycle.approvalData.token_expires_at);
        if (expiryDate < new Date()) {
          setError('expired');
          setLoading(false);
          return;
        }
      }

      setCyclePlan(cycle);

      const [customerData, serviceData] = await Promise.all([
        Client.get(cycle.clientId).catch(() => null),
        Service.get(cycle.serviceId).catch(() => null),
      ]);

      setCustomer(customerData);
      setService(serviceData);
    } catch (err) {
      console.error('Erro ao carregar dados de aprovação:', err?.message || err);
      setError('Falha ao carregar dados da aprovação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [entry, profile, sessionLoading]);

  useEffect(() => {
    loadApprovalData();
  }, [loadApprovalData]);

  const handleApproval = async (approvedDecision, comment = '') => {
    if (!canMutate) {
      toast.error('Sem permissão para decidir neste fluxo legado.');
      return;
    }
    setApproving(true);
    try {
      const updates = {
        status: approvedDecision ? 'approved' : 'rejected',
        approvalData: {
          ...cyclePlan.approvalData,
          approved_at: approvedDecision ? new Date().toISOString() : null,
          approver_comment: comment,
          approver_user_agent: navigator.userAgent,
          decided_via: 'legacy_cycle_approval_staff',
        },
      };

      await CyclePlan.update(cyclePlan.id, updates);

      setApproved(approvedDecision);
      toast.success(
        approvedDecision ? 'Planejamento aprovado com sucesso!' : 'Planejamento rejeitado'
      );
    } catch (err) {
      console.error('Erro na aprovação:', err?.message || err);
      toast.error('Erro ao processar aprovação. Tente novamente.');
    } finally {
      setApproving(false);
    }
  };

  // Estados de fallback
  if (loading) return <LoadingState />;

  if (error) {
    if (error === 'expired') return <ExpiredState token={entry.token} />;
    if (error.includes('não encontrado')) return <InvalidTokenState token={entry.token} />;
    return <ErrorState error={error} token={entry.token} />;
  }

  if (!cyclePlan) {
    return <InvalidTokenState token={entry.token} />;
  }

  if (approved || cyclePlan.status === 'approved') {
    return (
      <div className="min-h-screen bg-[#EEF4FA] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <CardTitle className="text-green-800">Planejamento Aprovado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                O planejamento foi aprovado com sucesso!
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Cliente:</strong> {customer?.name || 'Não identificado'}</p>
              <p><strong>Período:</strong> {cyclePlan.cyclePeriod}</p>
              <p><strong>Aprovado em:</strong> {
                cyclePlan.approvalData?.approved_at ? 
                new Date(cyclePlan.approvalData.approved_at).toLocaleString('pt-BR') : 
                'Agora'
              }</p>
            </div>

            <p className="text-sm text-slate-500">
              Sua agência foi notificada e iniciará a execução do planejamento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar tela de aprovação normal...
  return (
    <div className="min-h-screen bg-[#EEF4FA] p-6">
      <div className="max-w-4xl mx-auto">
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <AlertDescription className="text-amber-900 text-sm">
            Fluxo legado (somente equipe). Para clientes, use{' '}
            <Link className="underline font-medium" to={createPageUrl('public-approval')}>
              /public-approval
            </Link>{' '}
            ou o review de material{' '}
            <Link className="underline font-medium" to="/review">
              /review
            </Link>
            . Tokens legados não são invalidados automaticamente.
          </AlertDescription>
        </Alert>
        {/* Header da aprovação */}
        <Card className="mb-6 rounded-2xl border-transparent shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight text-[#18162A]">
                  Aprovação de Planejamento
                </CardTitle>
                <p className="text-[#7A7595] mt-2">
                  Revise e aprove o planejamento estratégico para {cyclePlan.cyclePeriod}
                </p>
              </div>
              <Badge className="bg-[#FCE8E3] text-[#8A1C05] border border-[#FFD4C8]">
                Aguardando Aprovação
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="border-t">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Cliente:</span>
                <span className="font-medium">{customer?.name || 'Carregando...'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Serviço:</span>
                <span className="font-medium">{service?.name || 'Carregando...'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Período:</span>
                <span className="font-medium">{cyclePlan.cyclePeriod}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo do planejamento */}
        {cyclePlan.planData && (
          <Card className="mb-6 rounded-2xl border-transparent shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#18162A]">Detalhes do Planejamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {cyclePlan.planData.mudancaChave && (
                <div>
                  <h3 className="font-semibold text-[#18162A] mb-2">Mudança-Chave</h3>
                  <p className="text-[#5A3A7A] bg-[#FCE8E3] border border-[#FFD4C8] p-3 rounded-2xl">
                    {cyclePlan.planData.mudancaChave}
                  </p>
                </div>
              )}

              {cyclePlan.planData.prioridades && cyclePlan.planData.prioridades.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#18162A] mb-3">Prioridades do Ciclo</h3>
                  <div className="space-y-2">
                    {cyclePlan.planData.prioridades.map((prioridade, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-[#EEF4FA] rounded-2xl">
                        <Badge variant="outline" className="mt-1 text-xs">
                          {index + 1}
                        </Badge>
                        <div>
                          {typeof prioridade === 'string' ? (
                            <p className="text-slate-700">{prioridade}</p>
                          ) : (
                            <div>
                              <p className="text-slate-900 font-medium">{prioridade.tarefa}</p>
                              {prioridade.racional && (
                                <p className="text-slate-600 text-sm mt-1">{prioridade.racional}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outros campos do planejamento... */}
            </CardContent>
          </Card>
        )}

        {/* Botões de aprovação */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => handleApproval(false)}
                disabled={approving}
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
              >
                {approving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Solicitar Ajustes
              </Button>
              
              <Button
                onClick={() => handleApproval(true)}
                disabled={approving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {approving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Aprovar Planejamento
              </Button>
            </div>
            
            <p className="text-center text-sm text-slate-500 mt-4">
              Ao aprovar, você autoriza o início da execução deste planejamento estratégico.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}