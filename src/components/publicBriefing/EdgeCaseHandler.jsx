import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Trash2, Download, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function EdgeCaseHandler({ 
  token,
  error,
  onRecovery,
  onClearData,
  onExportData,
  responses,
  context 
}) {
  const [showDataDialog, setShowDataDialog] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    // Detectar problemas de localStorage
    try {
      const testKey = '_test_storage';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Calcular uso de storage
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      
      setStorageInfo({
        available: true,
        totalSize: Math.round(totalSize / 1024), // KB
        quota: 'N/A' // Browsers não expõem isso facilmente
      });
    } catch (error) {
      setStorageInfo({
        available: false,
        error: error.message
      });
    }
  }, []);

  const handleDataExport = () => {
    try {
      const dataToExport = {
        timestamp: new Date().toISOString(),
        token: token?.substring(0, 8) + '...',
        client: context?.client?.name,
        agency: context?.agency?.name,
        responses,
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          storageInfo
        }
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `briefing-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      onExportData?.();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDataClear = () => {
    if (confirm('⚠️ Isso apagará todas as respostas salvas localmente. Tem certeza?')) {
      try {
        // Limpar todos os dados relacionados ao briefing
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('briefing_autosave_') || key.includes(token)) {
            localStorage.removeItem(key);
          }
        });
        onClearData?.();
      } catch (error) {
        console.error('Clear failed:', error);
      }
    }
  };

  const getErrorType = () => {
    if (!error) return null;
    
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return 'expired_token';
    }
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return 'rate_limit';
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'network';
    }
    if (errorMessage.includes('storage') || errorMessage.includes('quota')) {
      return 'storage';
    }
    if (errorMessage.includes('validation')) {
      return 'validation';
    }
    
    return 'unknown';
  };

  const errorType = getErrorType();

  const getErrorSolution = () => {
    switch (errorType) {
      case 'expired_token':
        return {
          title: 'Link expirado',
          description: 'Este link de briefing não é mais válido.',
          solutions: [
            'Entre em contato com sua consultoria para solicitar um novo link',
            'Verifique se o link foi copiado corretamente'
          ],
          canRecover: false
        };
      
      case 'rate_limit':
        return {
          title: 'Muitas tentativas',
          description: 'Você excedeu o limite de tentativas. Tente novamente em alguns minutos.',
          solutions: [
            'Aguarde alguns minutos antes de tentar novamente',
            'Use apenas uma aba do navegador',
            'Evite recarregar a página repetidamente'
          ],
          canRecover: true,
          retryAfter: 5 * 60 * 1000 // 5 minutos
        };
        
      case 'network':
        return {
          title: 'Problema de conexão',
          description: 'Não foi possível conectar ao servidor.',
          solutions: [
            'Verifique sua conexão com a internet',
            'Tente recarregar a página',
            'Desative VPN ou proxy temporariamente'
          ],
          canRecover: true
        };
        
      case 'storage':
        return {
          title: 'Problema de armazenamento',
          description: 'Não é possível salvar dados localmente.',
          solutions: [
            'Limpe o cache do navegador',
            'Libere espaço de armazenamento',
            'Use modo privado/anônimo'
          ],
          canRecover: true
        };
        
      case 'validation':
        return {
          title: 'Erro de validação',
          description: 'Alguns dados não estão no formato correto.',
          solutions: [
            'Revise as respostas destacadas em vermelho',
            'Certifique-se de preencher todos os campos obrigatórios',
            'Verifique formatos de email, números e datas'
          ],
          canRecover: true
        };
        
      default:
        return {
          title: 'Erro inesperado',
          description: 'Ocorreu um problema técnico.',
          solutions: [
            'Recarregue a página',
            'Tente usar outro navegador',
            'Entre em contato com o suporte se o problema persistir'
          ],
          canRecover: true
        };
    }
  };

  if (!error && storageInfo?.available) return null;

  const solution = getErrorSolution();

  return (
    <div className="space-y-4">
      {solution && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              {solution.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                {solution.description}
              </AlertDescription>
            </Alert>

            <div>
              <h4 className="font-medium mb-2">Possíveis soluções:</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {solution.solutions.map((sol, index) => (
                  <li key={index}>{sol}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              {solution.canRecover && (
                <Button onClick={onRecovery} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              )}
              
              {Object.keys(responses || {}).length > 0 && (
                <Button onClick={handleDataExport} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Fazer Backup
                </Button>
              )}
              
              <Dialog open={showDataDialog} onOpenChange={setShowDataDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Opções de Dados
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Gerenciar Dados Locais</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {storageInfo && (
                      <div className="p-3 bg-gray-50 rounded">
                        <h4 className="font-medium mb-2">Status do Armazenamento:</h4>
                        <div className="text-sm space-y-1">
                          <div>Status: {storageInfo.available ? '✓ Funcionando' : '❌ Indisponível'}</div>
                          {storageInfo.totalSize && (
                            <div>Uso: {storageInfo.totalSize} KB</div>
                          )}
                          {storageInfo.error && (
                            <div className="text-red-600">Erro: {storageInfo.error}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Button onClick={handleDataExport} variant="outline" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar Dados de Backup
                      </Button>
                      
                      <Button onClick={handleDataClear} variant="destructive" className="w-full">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Limpar Dados Locais
                      </Button>
                    </div>
                    
                    <Alert>
                      <AlertDescription className="text-xs">
                        O backup inclui suas respostas e pode ser usado para restaurar o progresso. 
                        A limpeza remove todos os dados salvos localmente.
                      </AlertDescription>
                    </Alert>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {!storageInfo?.available && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Armazenamento local indisponível:</strong> Suas respostas não estão sendo salvas automaticamente. 
            Evite recarregar a página e preencha o briefing rapidamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}