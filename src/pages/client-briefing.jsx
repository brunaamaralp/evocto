
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Plus, 
  Eye, 
  Edit, 
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Link as LinkIcon,
  Mail
} from 'lucide-react';
import { Brief } from '@/api/entities';
import { Client } from '@/api/entities';
import { PublicBriefingToken } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Link, useNavigate } from 'react-router-dom';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

/**
 * Página principal de briefings do cliente
 * Lista briefings existentes e permite criar novos
 */
export default function ClientBriefingPage() {
  const { user, agencyId } = useSession();
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [briefings, setBriefings] = useState([]);
  const [briefingTokens, setBriefingTokens] = useState([]);
  const [error, setError] = useState(null);

  const loadClientBriefings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!clientId) {
        throw new Error('ID do cliente não fornecido');
      }

      // Carregar cliente
      const clientData = await Client.get(clientId);
      if (!clientData || clientData.agencyId !== agencyId) {
        throw new Error('Cliente não encontrado ou sem permissão');
      }
      setClient(clientData);

      // Buscar briefings do cliente (por projectId que equivale a clientId)
      const clientBriefings = await Brief.filter({
        agencyId,
        projectId: clientId
      });
      setBriefings(clientBriefings);

      // Buscar tokens de briefing público
      const tokens = await PublicBriefingToken.filter({
        agencyId,
        clientId
      });
      setBriefingTokens(tokens);

    } catch (err) {
      console.error('Erro ao carregar briefings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]); // Dependencies for useCallback

  useEffect(() => {
    loadClientBriefings();
  }, [loadClientBriefings]); // useEffect now depends on the memoized function

  const getStatusBadge = (brief) => {
    const statusMap = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Rascunho' },
      IN_REVIEW: { color: 'bg-yellow-100 text-yellow-800', icon: Eye, label: 'Em Revisão' },
      READY: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Finalizado' }
    };
    
    const config = statusMap[brief.status] || statusMap.DRAFT;
    const StatusIcon = config.icon;
    
    return (
      <Badge className={config.color}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTokenStatusBadge = (token) => {
    if (token.status === 'expired' || new Date(token.expiresAt) < new Date()) {
      return <Badge className="bg-red-100 text-red-800">Expirado</Badge>;
    }
    if (token.status === 'revoked') {
      return <Badge className="bg-gray-100 text-gray-800">Revogado</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
  };

  const handleCreateBriefing = () => {
    navigate(`${createPageUrl('briefing-editor')}?clientId=${clientId}`);
  };

  const handleEditBriefing = (briefId) => {
    navigate(`${createPageUrl('briefing-editor')}?briefingId=${briefId}`);
  };

  const handleGenerateToken = async () => {
    try {
      const { generatePublicBriefingToken } = await import('@/api/functions');
      
      await generatePublicBriefingToken({
        clientId,
        language: 'pt',
        expiresInHours: 168 // 7 dias
      });
      
      // Recarregar tokens
      await loadClientBriefings();
    } catch (err) {
      console.error('Erro ao gerar token:', err);
      setError('Erro ao gerar link público');
    }
  };

  if (loading) {
    return <LoadingState message="Carregando briefings..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Briefings - {client?.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie briefings e formulários de coleta de informações
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleGenerateToken} variant="outline">
              <LinkIcon className="w-4 h-4 mr-2" />
              Gerar Link Público
            </Button>
            <Button onClick={handleCreateBriefing}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Briefing
            </Button>
          </div>
        </div>

        {/* Briefings Internos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Briefings Internos
              <Badge variant="outline">{briefings.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {briefings.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum briefing criado
                </h3>
                <p className="text-gray-600 mb-4">
                  Crie um briefing para coletar informações do cliente
                </p>
                <Button onClick={handleCreateBriefing}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Briefing
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {briefings.map((brief) => (
                  <div
                    key={brief.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">
                          Briefing Mestre
                        </h3>
                        {getStatusBadge(brief)}
                        {brief.completion_score !== undefined && (
                          <Badge variant="outline">
                            {brief.completion_score}% completo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Criado em {new Date(brief.created_date).toLocaleDateString('pt-BR')}
                        {brief.updated_date && brief.updated_date !== brief.created_date && (
                          <span> • Atualizado em {new Date(brief.updated_date).toLocaleDateString('pt-BR')}</span>
                        )}
                      </p>
                      {brief.business_context && (
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                          {brief.business_context}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBriefing(brief.id)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Links Públicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Links Públicos
              <Badge variant="outline">{briefingTokens.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {briefingTokens.length === 0 ? (
              <div className="text-center py-8">
                <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum link público gerado
                </h3>
                <p className="text-gray-600 mb-4">
                  Gere um link público para o cliente preencher o briefing
                </p>
                <Button onClick={handleGenerateToken} variant="outline">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Gerar Primeiro Link
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {briefingTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">
                          Link Público #{token.id.slice(-8)}
                        </h3>
                        {getTokenStatusBadge(token)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Criado em {new Date(token.created_date).toLocaleDateString('pt-BR')} •
                        Expira em {new Date(token.expiresAt).toLocaleDateString('pt-BR')} •
                        {token.accessCount || 0} acessos
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {token.status === 'active' && new Date(token.expiresAt) > new Date() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = `${window.location.origin}/public-briefing?token=${token.token}`;
                            navigator.clipboard.writeText(url);
                            alert('Link copiado!');
                          }}
                        >
                          <LinkIcon className="w-4 h-4 mr-1" />
                          Copiar Link
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
