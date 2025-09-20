
import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Link, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  X,
  Clock,
  Shield,
  Eye
} from "lucide-react";
import { generatePublicBriefingToken } from "@/api/functions";
import { revokePublicBriefingToken } from "@/api/functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createPageUrl } from "@/utils";

export default function BriefingStatusBadge({ 
  clientId, 
  initialStatus = "not_started", 
  compact = false, 
  onViewClient 
}) {
  const [status, setStatus] = useState(initialStatus);
  const [token, setToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showActions, setShowActions] = useState(false);

  const publicUrl = token ? `${window.location.origin}/public-briefing?token=${token}` : null;

  const statusConfig = {
    not_started: {
      label: "Não iniciado",
      variant: "secondary",
      className: "bg-gray-100 text-gray-700"
    },
    pending: {
      label: "Link enviado",
      variant: "outline", 
      className: "bg-blue-50 text-blue-700 border-blue-200"
    },
    in_progress: {
      label: "Em progresso",
      variant: "default",
      className: "bg-amber-100 text-amber-700"
    },
    completed: {
      label: "Concluído",
      variant: "default",
      className: "bg-green-100 text-green-700"
    },
    expired: {
      label: "Expirado",
      variant: "destructive",
      className: "bg-red-100 text-red-700"
    }
  };

  const currentConfig = statusConfig[status] || statusConfig.not_started;

  const handleGenerateToken = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Gerando token para clientId:', clientId);
      
      const { data } = await generatePublicBriefingToken({
        clientId,
        expiresInHours: 168, // 7 dias
        reuseIfActiveExists: true
      });
      
      console.log('Token gerado com sucesso:', data);
      
      if (data.success && data.token) {
        setToken(data.token.token);
        setStatus("pending");
      } else {
        throw new Error(data.error || 'Falha na geração do token');
      }
    } catch (err) {
      console.error("Erro detalhado ao gerar token:", err);
      
      // Melhor tratamento de erros baseado no tipo
      let errorMessage = "Erro ao gerar link do briefing";
      
      if (err.response?.status === 401) {
        errorMessage = "Erro de autenticação. Faça login novamente.";
      } else if (err.response?.status === 403) {
        errorMessage = "Sem permissão para gerar link para este cliente.";
      } else if (err.response?.status === 404) {
        errorMessage = "Cliente não encontrado.";
      } else if (err.response?.status === 429) { // Added this condition for rate limit
        errorMessage = "Muitas tentativas. Aguarde 1 minuto e tente novamente.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
      setError("Erro ao copiar link");
    }
  };

  const handleRevokeToken = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await revokePublicBriefingToken({
        clientId,
        reason: 'manual_revocation'
      });
      
      setToken(null);
      setStatus("not_started");
      setShowActions(false);
    } catch (err) {
      console.error("Erro ao revogar token:", err);
      setError("Erro ao revogar link");
    } finally {
      setLoading(false);
    }
  };

  const handleRenewToken = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Primeiro revoga o token atual
      await revokePublicBriefingToken({
        clientId,
        reason: 'manual_renewal'
      });
      
      // Depois gera um novo
      const { data } = await generatePublicBriefingToken({
        clientId,
        expiresInHours: 168, // 7 dias
        reuseIfActiveExists: false // Força criação de novo token
      });
      
      setToken(data.token.token);
      setStatus("pending");
      setShowActions(false);
    } catch (err) {
      console.error("Erro ao renovar token:", err);
      setError("Erro ao renovar link");
    } finally {
      setLoading(false);
    }
  };

  const handleViewClient = () => {
    if (onViewClient) {
      onViewClient();
    } else {
      // Navegação padrão para o contexto do cliente
      window.location.href = createPageUrl('client') + `?clientId=${clientId}`;
    }
  };

  // Versão compacta para cards de cliente
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Botão Ver Cliente - SEMPRE VISÍVEL */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewClient}
          className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Eye className="w-3 h-3 mr-1" />
          Ver detalhes
        </Button>

        {/* Popover de Briefing */}
        <Popover open={showActions} onOpenChange={setShowActions}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <Badge className={currentConfig.className}>
                {currentConfig.label}
              </Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Link do Briefing</h4>
                <Badge className={currentConfig.className}>
                  {currentConfig.label}
                </Badge>
              </div>

              {error && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {status === "not_started" ? (
                <Button
                  onClick={handleGenerateToken}
                  disabled={loading}
                  className="w-full"
                  size="sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4 mr-2" />
                      Gerar Link
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopyLink}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Renovar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Renovar link do briefing?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O link atual será invalidado e um novo será criado com validade de 7 dias.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRenewToken} disabled={loading}>
                            {loading ? "Renovando..." : "Renovar"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full text-red-600 hover:text-red-700">
                        <Shield className="w-4 h-4 mr-2" />
                        Revogar Link
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revogar link do briefing?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O link será invalidado e o cliente não poderá mais acessar o briefing. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleRevokeToken} 
                          disabled={loading}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {loading ? "Revogando..." : "Revogar"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Versão completa para visualização detalhada
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Status do Briefing</h4>
              <Badge className={currentConfig.className}>
                {currentConfig.label}
              </Badge>
            </div>
            
            {token && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Válido por 7 dias</span>
              </div>
            )}
          </div>

          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Botão Ver Cliente - SEMPRE VISÍVEL */}
          <Button
            onClick={handleViewClient}
            variant="outline" 
            className="w-full"
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver Detalhes do Cliente
          </Button>

          {status === "not_started" ? (
            <Button
              onClick={handleGenerateToken}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando link do briefing...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Gerar Link do Briefing
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              {publicUrl && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-xs text-gray-600 mb-1">Link público:</div>
                  <div className="text-sm font-mono break-all">{publicUrl}</div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      Link copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Link
                    </>
                  )}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renovar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Renovar link do briefing?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O link atual será invalidado e um novo será criado com validade de 7 dias.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRenewToken} disabled={loading}>
                        {loading ? "Renovando..." : "Renovar"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                    <Shield className="w-4 h-4 mr-2" />
                    Revogar Link
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revogar link do briefing?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O link será invalidado e o cliente não poderá mais acessar o briefing. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleRevokeToken} 
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {loading ? "Revogando..." : "Revogar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
