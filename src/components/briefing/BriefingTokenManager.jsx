
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Link as LinkIcon,
  Copy,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Settings,
  Trash2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Send
} from 'lucide-react';
import { generatePublicBriefingToken } from '@/api/functions';
import { revokePublicBriefingToken } from '@/api/functions';
import { useNotification } from '@/components/feedback/NotificationSystem';

export default function BriefingTokenManager({ 
  clientId, 
  serviceId,
  onTokenGenerated,
  className = "" 
}) {
  const { notify } = useNotification();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [config, setConfig] = useState({
    language: 'pt',
    expiresInHours: 168, // 7 dias
    reuseIfActiveExists: true,
    maxAttempts: 10,
    windowMinutes: 60
  });
  const [showTokenDetails, setShowTokenDetails] = useState({});
  const [error, setError] = useState(null);

  const loadTokens = useCallback(async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Mock de tokens existentes
      // Em implementação real, buscar do backend
      const mockTokens = [
        {
          id: 'token_001',
          token: 'abc123...xyz789',
          status: 'active',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          accessCount: 3,
          lastAccessedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          created_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            language: 'pt',
            createdBy: 'admin@empresa.com'
          }
        }
      ];

      setTokens(mockTokens);
    } catch (err) {
      console.error('Erro ao carregar tokens:', err);
      setError('Erro ao carregar tokens existentes');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleGenerateToken = async () => {
    if (!clientId) {
      notify('error', 'Cliente não selecionado');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const result = await generatePublicBriefingToken({
        clientId,
        serviceId,
        language: config.language,
        expiresInHours: config.expiresInHours,
        reuseIfActiveExists: config.reuseIfActiveExists,
        rateLimitConfig: {
          maxAttempts: config.maxAttempts,
          windowMinutes: config.windowMinutes
        }
      });

      if (result.data?.success) {
        const { token, publicUrl, reused } = result.data;
        
        notify('success', reused 
          ? 'Token existente reutilizado com sucesso!' 
          : 'Token de briefing gerado com sucesso!'
        );

        // Atualizar lista de tokens
        await loadTokens();
        
        if (onTokenGenerated) {
          onTokenGenerated({ token, publicUrl, reused });
        }

        // Copiar URL para clipboard automaticamente
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(publicUrl);
          notify('info', 'URL copiada para o clipboard!', { duration: 2000 });
        }

      } else {
        throw new Error(result.data?.error || 'Erro desconhecido');
      }

    } catch (err) {
      console.error('Erro ao gerar token:', err);
      const errorMessage = err.message || 'Erro ao gerar token de briefing';
      setError(errorMessage);
      notify('error', errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeToken = async (tokenId) => {
    try {
      const result = await revokePublicBriefingToken({
        tokenId,
        reason: 'manual_revocation'
      });

      if (result.data?.success) {
        notify('success', 'Token revogado com sucesso');
        await loadTokens();
      } else {
        throw new Error(result.data?.error || 'Erro ao revogar token');
      }
    } catch (err) {
      console.error('Erro ao revogar token:', err);
      notify('error', err.message || 'Erro ao revogar token');
    }
  };

  const handleCopyUrl = async (token) => {
    const publicUrl = `${window.location.origin}/public-briefing?token=${token}`;
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(publicUrl);
        notify('success', 'URL copiada para o clipboard!', { duration: 2000 });
      } else {
        // Fallback para navegadores antigos
        const textArea = document.createElement('textarea');
        textArea.value = publicUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        notify('success', 'URL copiada!', { duration: 2000 });
      }
    } catch (err) {
      console.error('Erro ao copiar URL:', err);
      notify('error', 'Erro ao copiar URL');
    }
  };

  const toggleTokenVisibility = (tokenId) => {
    setShowTokenDetails(prev => ({
      ...prev,
      [tokenId]: !prev[tokenId]
    }));
  };

  const formatExpirationTime = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff < 0) return 'Expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
    return 'Menos de 1 hora';
  };

  const getTokenStatusColor = (status, expiresAt) => {
    if (status === 'revoked') return 'destructive';
    if (new Date(expiresAt) < new Date()) return 'secondary';
    return 'default';
  };

  const getTokenStatusLabel = (status, expiresAt) => {
    if (status === 'revoked') return 'Revogado';
    if (new Date(expiresAt) < new Date()) return 'Expirado';
    return 'Ativo';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Carregando tokens...</span>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuração de Novo Token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Gerar Link de Briefing Público
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Configurações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Idioma</Label>
              <Select 
                value={config.language} 
                onValueChange={(value) => setConfig(prev => ({...prev, language: value}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Expira em (horas)</Label>
              <Select 
                value={config.expiresInHours.toString()} 
                onValueChange={(value) => setConfig(prev => ({...prev, expiresInHours: parseInt(value)}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 horas (1 dia)</SelectItem>
                  <SelectItem value="72">72 horas (3 dias)</SelectItem>
                  <SelectItem value="168">168 horas (7 dias)</SelectItem>
                  <SelectItem value="336">336 horas (14 dias)</SelectItem>
                  <SelectItem value="720">720 horas (30 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Configurações Avançadas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Reutilizar token ativo</Label>
                <p className="text-sm text-gray-600">Se já existe um token ativo, reutilizar ao invés de criar novo</p>
              </div>
              <Switch
                checked={config.reuseIfActiveExists}
                onCheckedChange={(checked) => setConfig(prev => ({...prev, reuseIfActiveExists: checked}))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Máx. tentativas</Label>
                <Input
                  type="number"
                  value={config.maxAttempts}
                  onChange={(e) => setConfig(prev => ({...prev, maxAttempts: parseInt(e.target.value) || 10}))}
                  min="1"
                  max="50"
                />
              </div>
              <div>
                <Label>Janela (minutos)</Label>
                <Input
                  type="number"
                  value={config.windowMinutes}
                  onChange={(e) => setConfig(prev => ({...prev, windowMinutes: parseInt(e.target.value) || 60}))}
                  min="5"
                  max="1440"
                />
              </div>
            </div>
          </div>

          {/* Botão de Gerar */}
          <Button 
            onClick={handleGenerateToken}
            disabled={generating || !clientId}
            className="w-full"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Gerando token...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Gerar Link de Briefing
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Tokens Existentes */}
      {tokens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tokens Existentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tokens.map((token) => (
                <div key={token.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant={getTokenStatusColor(token.status, token.expiresAt)}>
                        {getTokenStatusLabel(token.status, token.expiresAt)}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        Expira em: {formatExpirationTime(token.expiresAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTokenVisibility(token.id)}
                      >
                        {showTokenDetails[token.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyUrl(token.token)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/public-briefing?token=${token.token}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      {token.status === 'active' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRevokeToken(token.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {showTokenDetails[token.id] && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Acessos:</strong> {token.accessCount || 0}
                        </div>
                        <div>
                          <strong>Último acesso:</strong> {
                            token.lastAccessedAt 
                              ? new Date(token.lastAccessedAt).toLocaleString('pt-BR')
                              : 'Nunca'
                          }
                        </div>
                        <div>
                          <strong>Criado em:</strong> {new Date(token.created_date).toLocaleString('pt-BR')}
                        </div>
                        <div>
                          <strong>Idioma:</strong> {token.metadata?.language === 'pt' ? 'Português' : 'English'}
                        </div>
                      </div>
                      <div>
                        <strong>Token:</strong>
                        <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                          {token.token}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
