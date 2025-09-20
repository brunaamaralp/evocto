
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Plus, 
  Edit, 
  Link as LinkIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { Brief } from '@/api/entities';
import { PublicBriefingToken } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import LoadingState from '@/components/shared/LoadingState';

/**
 * Tab de briefing na página do cliente
 * Versão simplificada que mostra status e permite navegar
 */
export default function BriefingTab({ client }) {
  const [loading, setLoading] = useState(true);
  const [briefings, setBriefings] = useState([]);
  const [publicTokens, setPublicTokens] = useState([]);
  const [error, setError] = useState(null);

  const loadBriefingData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar briefings internos
      const clientBriefings = await Brief.filter({
        agencyId: client.agencyId,
        projectId: client.id
      });
      setBriefings(clientBriefings);

      // Buscar tokens públicos ativos
      const tokens = await PublicBriefingToken.filter({
        agencyId: client.agencyId,
        clientId: client.id,
        status: 'active'
      });
      setPublicTokens(tokens.filter(t => new Date(t.expiresAt) > new Date()));

    } catch (err) {
      console.error('Erro ao carregar dados de briefing:', err);
      setError('Erro ao carregar briefings');
    } finally {
      setLoading(false);
    }
  }, [client?.agencyId, client?.id]);

  useEffect(() => {
    if (client?.id) {
      loadBriefingData();
    }
  }, [client?.id, loadBriefingData]);

  const getStatusInfo = (brief) => {
    const statusMap = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Rascunho' },
      IN_REVIEW: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Em Revisão' },
      READY: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Finalizado' }
    };
    
    return statusMap[brief.status] || statusMap.DRAFT;
  };

  if (loading) {
    return <LoadingState message="Carregando briefings..." />;
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{briefings.length}</div>
                <div className="text-sm text-gray-600">Briefings Criados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <LinkIcon className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{publicTokens.length}</div>
                <div className="text-sm text-gray-600">Links Ativos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {briefings.filter(b => b.status === 'READY').length}
                </div>
                <div className="text-sm text-gray-600">Finalizados</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Principais */}
      <div className="flex gap-3">
        <Button asChild>
          <Link to={`${createPageUrl('client-briefing')}?clientId=${client.id}`}>
            <FileText className="w-4 h-4 mr-2" />
            Ver Todos os Briefings
          </Link>
        </Button>
        
        <Button asChild variant="outline">
          <Link to={`${createPageUrl('briefing-editor')}?clientId=${client.id}`}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Briefing
          </Link>
        </Button>
      </div>

      {/* Lista Resumida */}
      {briefings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Briefings Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {briefings.slice(0, 3).map((brief) => {
                const statusInfo = getStatusInfo(brief);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div
                    key={brief.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">Briefing Mestre</h4>
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        {brief.completion_score !== undefined && (
                          <Badge variant="outline">
                            {brief.completion_score}% completo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Criado em {new Date(brief.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link to={`${createPageUrl('briefing-editor')}?briefingId=${brief.id}`}>
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
            
            {briefings.length > 3 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`${createPageUrl('client-briefing')}?clientId=${client.id}`}>
                    Ver todos os {briefings.length} briefings
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Links Públicos Ativos */}
      {publicTokens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Links Públicos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {publicTokens.slice(0, 2).map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-green-900">
                      Link #{token.id.slice(-8)}
                    </p>
                    <p className="text-sm text-green-700">
                      Expira em {new Date(token.expiresAt).toLocaleDateString('pt-BR')} •
                      {token.accessCount || 0} acessos
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = `${window.location.origin}/public-briefing?token=${token.token}`;
                      navigator.clipboard.writeText(url);
                      alert('Link copiado para área de transferência!');
                    }}
                  >
                    <LinkIcon className="w-4 h-4 mr-1" />
                    Copiar Link
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
