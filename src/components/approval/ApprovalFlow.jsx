import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Send, 
  ExternalLink, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Copy,
  RefreshCw,
  Shield,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BriefingVersion } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { format, isAfter, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ApprovalFlow({ 
  scope, 
  brief, 
  insights, 
  project, 
  client,
  onSendForApproval,
  onRegenerateToken,
  isSending = false 
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadVersions();
  }, [scope?.id]);

  const loadVersions = async () => {
    if (!scope?.brief_id) return;
    
    setLoading(true);
    try {
      const versionsList = await BriefingVersion.filter({ briefing_id: scope.brief_id }, '-created_date');
      setVersions(versionsList);
    } catch (error) {
      console.error("Erro ao carregar versões:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado para a área de transferência!");
  };

  const getPublicUrl = (token) => {
    return `${window.location.origin}${createPageUrl(`PublicApproval?token=${token}`)}`;
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return isAfter(new Date(), new Date(expiresAt));
  };

  const getExpiryStatus = (version) => {
    if (version.status === 'approved') {
      return { type: 'permanent', label: 'Link permanente', color: 'green' };
    }
    
    if (!version.public_share_expires_at) {
      return { type: 'unknown', label: 'Sem expiração definida', color: 'gray' };
    }

    const now = new Date();
    const expiresAt = new Date(version.public_share_expires_at);
    const hoursLeft = differenceInHours(expiresAt, now);
    
    if (hoursLeft <= 0) {
      return { type: 'expired', label: 'Expirado', color: 'red' };
    } else if (hoursLeft <= 24) {
      return { 
        type: 'expiring_soon', 
        label: `Expira em ${hoursLeft}h`, 
        color: 'amber' 
      };
    } else {
      return { 
        type: 'valid', 
        label: `Expira em: ${format(expiresAt, "dd/MM 'às' HH:mm", { locale: ptBR })}`, 
        color: 'blue' 
      };
    }
  };

  const canSendApproval = () => {
    return scope?.approved_title && 
           scope?.in_scope?.length > 0 && 
           scope?.out_of_scope?.length > 0;
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Send className="w-5 h-5 text-green-600" />
          Fluxo de Aprovação
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Send for Approval Section */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Enviar para Cliente</h3>
              <p className="text-sm text-slate-600">
                Gere uma versão pública (somente leitura) para revisão e aprovação do cliente.
              </p>
            </div>
            
            <Button
              onClick={onSendForApproval}
              disabled={isSending || !canSendApproval()}
              className="bg-green-600 hover:bg-green-700"
              data-tutorial="send-approval-button"
            >
              {isSending ? (
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isSending ? "Enviando..." : "Enviar para Aprovação"}
            </Button>
          </div>

          {!canSendApproval() && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Pré-requisitos:</strong> Complete o título aprovado, itens do escopo (IN e OUT) antes de enviar para aprovação.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Existing Versions */}
        {versions.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Versões Enviadas
            </h3>
            
            <div className="space-y-3">
              {versions.map((version) => {
                const expiryStatus = getExpiryStatus(version);
                const publicUrl = getPublicUrl(version.public_share_token);
                
                return (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-lg bg-slate-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className={`${
                            version.status === 'approved' ? 'bg-green-100 text-green-700' :
                            version.status === 'released' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {version.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {version.status === 'released' && <Clock className="w-3 h-3 mr-1" />}
                            {version.status === 'approved' ? 'Aprovado' : 
                             version.status === 'released' ? 'Aguardando' : version.status}
                          </Badge>
                          
                          <Badge className={`${
                            expiryStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                            expiryStatus.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                            expiryStatus.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                            expiryStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {expiryStatus.type === 'permanent' && <Shield className="w-3 h-3 mr-1" />}
                            {expiryStatus.type !== 'permanent' && <Calendar className="w-3 h-3 mr-1" />}
                            {expiryStatus.label}
                          </Badge>
                          
                          <span className="text-sm text-slate-500">
                            {version.version_number} • {format(new Date(version.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        
                        <p className="text-sm font-medium text-slate-900">
                          {version.approved_title || 'Título não definido'}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        {/* Regenerate Token (only for RCs) */}
                        {version.status === 'released' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRegenerateToken(version.id)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Regerar Link
                          </Button>
                        )}
                        
                        {/* Copy Link */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(publicUrl)}
                          disabled={expiryStatus.type === 'expired'}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copiar Link
                        </Button>
                        
                        {/* Open Link */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(publicUrl, '_blank')}
                          disabled={expiryStatus.type === 'expired'}
                          data-tutorial="public-link"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Abrir
                        </Button>
                        
                        {/* Download PDF (approved versions only) */}
                        {version.status === 'approved' && version.pdf_url && (
                          <Button
                            size="sm"
                            onClick={() => window.open(version.pdf_url, '_blank')}
                            className="bg-slate-600 hover:bg-slate-700"
                            data-tutorial="download-pdf-button"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* URL Display */}
                    <div className="mt-3 p-2 bg-white border rounded text-xs font-mono text-slate-600 break-all">
                      {publicUrl}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}