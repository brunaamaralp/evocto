import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { BriefingTemplate } from '@/api/entities';
import { PublicBriefingToken } from '@/api/entities';
import { PublicBriefingResponse } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Users, Clock, CheckCircle, 
  AlertCircle, Send, Eye, Download, Plus,
  Copy, Mail, Calendar, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LoadingState from '@/components/shared/LoadingStates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Componente para Token de Diagnóstico
const DiagnosticTokenCard = ({ token, client, onRevoke }) => {
  const isExpired = new Date(token.expiresAt) < new Date();
  const isActive = token.status === 'active' && !isExpired;
  
  const copyLink = async () => {
    const publicUrl = `${window.location.origin}/public-briefing?token=${token.token}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link copiado para o clipboard!');
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const sendByEmail = () => {
    const subject = encodeURIComponent('Diagnóstico Financeiro - Sua Participação é Necessária');
    const body = encodeURIComponent(`
Olá,

Preparamos um diagnóstico financeiro personalizado para sua empresa. 
Por favor, acesse o link abaixo para preencher as informações:

${window.location.origin}/public-briefing?token=${token.token}

Este link expira em ${format(new Date(token.expiresAt), 'dd/MM/yyyy', { locale: ptBR })}.

Atenciosamente,
Equipe de Consultoria
    `);
    
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`);
  };

  return (
    <Card className={`border-l-4 ${isActive ? 'border-l-green-500' : isExpired ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900">{client.name}</h3>
              <Badge 
                className={
                  isActive ? 'bg-green-100 text-green-800' : 
                  isExpired ? 'bg-red-100 text-red-800' : 
                  'bg-yellow-100 text-yellow-800'
                }
              >
                {isActive ? 'Ativo' : isExpired ? 'Expirado' : token.status}
              </Badge>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Expira em: {format(new Date(token.expiresAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>Acessos: {token.accessCount || 0}</span>
              </div>
              {token.lastAccessedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Último acesso: {format(new Date(token.lastAccessedAt), 'dd/MM HH:mm', { locale: ptBR })}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {isActive && (
              <>
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={sendByEmail}>
                  <Mail className="w-4 h-4" />
                </Button>
              </>
            )}
            {isActive && (
              <Button variant="destructive" size="sm" onClick={() => onRevoke(token.id)}>
                Revogar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para Respostas de Diagnóstico
const DiagnosticResponseCard = ({ response, client }) => {
  const completionPercent = response.progressData ? 
    Math.round((response.progressData.completedQuestions?.length || 0) / (response.progressData.totalSteps || 1) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{client.name}</h3>
            <p className="text-sm text-gray-600">{client.email}</p>
          </div>
          <Badge className={response.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
            {response.status === 'completed' ? 'Concluído' : 'Em andamento'}
          </Badge>
        </div>
        
        {response.status !== 'completed' && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Progresso</span>
              <span className="text-sm font-medium">{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
          </div>
        )}
        
        <div className="text-sm text-gray-600 space-y-1">
          {response.submittedAt && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Enviado em: {format(new Date(response.submittedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
            </div>
          )}
          {response.lastSavedAt && !response.submittedAt && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Última atividade: {format(new Date(response.lastSavedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          {response.status === 'completed' && (
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Modal para Criar Novo Diagnóstico
const CreateDiagnosticModal = ({ clients, onCreateToken, isOpen, setIsOpen }) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [validityDays, setValidityDays] = useState(7);
  const [customMessage, setCustomMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedClientId) {
      toast.error('Selecione um cliente');
      return;
    }

    setCreating(true);
    try {
      await onCreateToken(selectedClientId, validityDays, customMessage);
      setIsOpen(false);
      setSelectedClientId('');
      setCustomMessage('');
      setValidityDays(7);
    } catch (error) {
      toast.error('Erro ao criar diagnóstico');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Diagnóstico</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Cliente</label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Validade (dias)</label>
            <Select value={validityDays.toString()} onValueChange={(v) => setValidityDays(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 dias</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="14">14 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Mensagem personalizada (opcional)</label>
            <Textarea 
              placeholder="Adicione uma mensagem personalizada que será incluída no email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Criando...' : 'Criar Diagnóstico'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente Principal
export default function FinancialDiagnosisPage() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [diagnosticTemplate, setDiagnosticTemplate] = useState(null);
  const [activeTokens, setActiveTokens] = useState([]);
  const [responses, setResponses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.agencyId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);

      // Carregar clientes
      const clientsData = await Client.filter({ 
        agencyId: user.agencyId,
        status: 'ativo' 
      });
      
      // Buscar template de diagnóstico
      const templates = await BriefingTemplate.filter({
        agencyId: user.agencyId,
        serviceType: 'gestao_financeira'
      });
      
      // Carregar tokens
      const tokens = await PublicBriefingToken.filter({
        agencyId: user.agencyId
      }, '-created_date');

      // Carregar respostas
      const responsesData = await PublicBriefingResponse.filter({
        agencyId: user.agencyId
      }, '-created_date');

      setClients(clientsData || []);
      setDiagnosticTemplate(templates?.[0] || null);
      setActiveTokens(tokens || []);
      setResponses(responsesData || []);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do diagnóstico');
    } finally {
      setLoading(false);
    }
  }, [user?.agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createDiagnosticToken = async (clientId, validityDays, customMessage) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + validityDays);

      const tokenData = {
        agencyId: user.agencyId,
        clientId: clientId,
        token: `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: expiryDate.toISOString(),
        status: 'active',
        metadata: {
          language: 'pt',
          templateType: 'financial_diagnosis',
          customMessage: customMessage || null
        }
      };

      await PublicBriefingToken.create(tokenData);
      
      toast.success(`Diagnóstico criado para ${client.name}!`);
      
      loadData(); // Recarregar dados
      
    } catch (error) {
      console.error('Erro ao criar token:', error);
      throw error;
    }
  };

  const revokeToken = async (tokenId) => {
    try {
      await PublicBriefingToken.update(tokenId, { 
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revokedBy: user.email 
      });
      
      toast.success('Diagnóstico revogado com sucesso');
      loadData();
    } catch (error) {
      console.error('Erro ao revogar token:', error);
      toast.error('Erro ao revogar diagnóstico');
    }
  };

  if (loading) {
    return <LoadingState message="Carregando diagnósticos..." />;
  }

  // Agrupar dados
  const clientsMap = clients.reduce((acc, client) => {
    acc[client.id] = client;
    return acc;
  }, {});

  const activeTokensWithClient = activeTokens.map(token => ({
    ...token,
    client: clientsMap[token.clientId]
  })).filter(token => token.client);

  const responsesWithClient = responses.map(response => ({
    ...response,
    client: clientsMap[response.clientId]
  })).filter(response => response.client);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Diagnóstico Financeiro 360°
              </h1>
              <p className="text-gray-600">
                Gerencie o processo de diagnóstico financeiro para seus clientes
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Diagnóstico
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Diagnósticos Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {activeTokens.filter(t => t.status === 'active' && new Date(t.expiresAt) > new Date()).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Respostas Recebidas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {responses.filter(r => r.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {responses.filter(r => r.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tokens Ativos */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Diagnósticos Enviados</h2>
          {activeTokensWithClient.length > 0 ? (
            <div className="space-y-4">
              {activeTokensWithClient.map((token) => (
                <DiagnosticTokenCard 
                  key={token.id}
                  token={token}
                  client={token.client}
                  onRevoke={revokeToken}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhum diagnóstico ativo</h3>
                <p className="text-gray-600 mb-4">Crie seu primeiro diagnóstico para começar.</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Diagnóstico
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Respostas Recebidas */}
        {responsesWithClient.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Respostas Recebidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {responsesWithClient.map((response) => (
                <DiagnosticResponseCard 
                  key={response.id}
                  response={response}
                  client={response.client}
                />
              ))}
            </div>
          </div>
        )}

        {/* Modal de Criação */}
        <CreateDiagnosticModal
          clients={clients}
          onCreateToken={createDiagnosticToken}
          isOpen={showCreateModal}
          setIsOpen={setShowCreateModal}
        />
      </div>
    </div>
  );
}