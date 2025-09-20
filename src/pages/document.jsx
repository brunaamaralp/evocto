import React, { useState, useEffect } from 'react';
import { ClientDocument } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, Eye, FileText, Calendar, User, Shield,
  AlertCircle, CheckCircle, Clock, ExternalLink
} from 'lucide-react';
import { CreateFileSignedUrl } from '@/api/integrations';
import { toast } from 'sonner';

export default function PublicDocumentPage() {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const shareToken = window.location.pathname.split('/document/')[1];

  useEffect(() => {
    const loadDocument = async () => {
      if (!shareToken) {
        setError('Token de compartilhamento não encontrado na URL');
        setLoading(false);
        return;
      }

      try {
        // Buscar documento pelo token de compartilhamento
        const documents = await ClientDocument.filter({
          'share_settings.share_token': shareToken
        });

        if (documents.length === 0) {
          setError('Documento não encontrado ou link expirado');
          setLoading(false);
          return;
        }

        const doc = documents[0];

        // Verificar se o link não expirou
        if (doc.share_settings?.share_expires_at) {
          const expiryDate = new Date(doc.share_settings.share_expires_at);
          if (new Date() > expiryDate) {
            setError('Este link de compartilhamento expirou');
            setLoading(false);
            return;
          }
        }

        setDocument(doc);

        // Gerar URL de download
        try {
          const signedUrlResponse = await CreateFileSignedUrl({
            file_uri: doc.fileUrl,
            expires_in: 3600
          });
          setDownloadUrl(signedUrlResponse.signed_url);
        } catch (urlError) {
          console.error('Erro ao gerar URL de download:', urlError);
        }

        // Atualizar contador de acesso
        try {
          await ClientDocument.update(doc.id, {
            'share_settings.download_count': (doc.share_settings?.download_count || 0) + 1,
            'share_settings.last_accessed_at': new Date().toISOString()
          });
        } catch (updateError) {
          console.warn('Erro ao atualizar contador:', updateError);
        }

      } catch (err) {
        console.error('Erro ao carregar documento:', err);
        setError('Erro ao carregar o documento');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [shareToken]);

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      toast.success('Download iniciado');
    } else {
      toast.error('URL de download não disponível');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('video')) return '🎥';
    if (fileType?.includes('audio')) return '🎵';
    return '📄';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Documento não encontrado
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.history.back()} variant="outline">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  {getFileIcon(document.fileType)}
                </div>
                <div>
                  <CardTitle className="text-2xl">{document.title}</CardTitle>
                  <p className="text-gray-600 mt-1">{document.fileName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">v{document.version}</Badge>
                    <Badge variant="secondary">
                      {document.group === 'diagnostic' ? 'Diagnóstico' :
                       document.group === 'report' ? 'Relatório' :
                       document.group === 'deliverable' ? 'Entregável' :
                       'Documento'}
                    </Badge>
                    {document.status === 'approved' && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aprovado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <Button 
                  onClick={handleDownload} 
                  disabled={!downloadUrl}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                
                {document.fileType === 'application/pdf' && downloadUrl && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(downloadUrl, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Descrição */}
        {document.description && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{document.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Informações do documento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Informações do Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  <strong>Criado:</strong> {new Date(document.created_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
              
              {document.uploadedBy && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Autor:</strong> {document.uploadedBy}
                  </span>
                </div>
              )}
              
              {document.fileSize && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>Tamanho:</strong> {formatFileSize(document.fileSize)}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  <strong>Compartilhamento:</strong> Link seguro
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aviso de expiração */}
        {document.share_settings?.share_expires_at && (
          <Alert className="border-orange-200 bg-orange-50">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Este link de compartilhamento expira em{' '}
              <strong>
                {new Date(document.share_settings.share_expires_at).toLocaleDateString('pt-BR')}
              </strong>
              . Faça o download se precisar acessar o documento posteriormente.
            </AlertDescription>
          </Alert>
        )}

        {/* Informações de acesso (se disponível) */}
        {document.share_settings?.download_count > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Este documento foi acessado {document.share_settings.download_count} vez(es)
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-400">
          <p>Documento compartilhado de forma segura via Evocto</p>
          <p className="mt-1">
            Powered by{' '}
            <a 
              href="https://evocto.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Evocto
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}