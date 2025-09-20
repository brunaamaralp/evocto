/**
 * 📱 Componente de Instalação PWA
 * 
 * Botão e funcionalidades para instalar a aplicação
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Trash2,
  HardDrive
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';

interface PWAInstallerProps {
  className?: string;
}

export default function PWAInstaller({ className }: PWAInstallerProps) {
  const {
    isInstallable,
    isInstalled,
    isOnline,
    isUpdateAvailable,
    cacheSize,
    install,
    update,
    clearCache,
    getCacheSize
  } = usePWA();

  const handleInstall = async () => {
    try {
      await install();
      toast.success('📱 Aplicação instalada com sucesso!');
    } catch (error) {
      toast.error('❌ Erro ao instalar aplicação');
    }
  };

  const handleUpdate = async () => {
    try {
      await update();
      toast.success('🔄 Aplicação atualizada!');
    } catch (error) {
      toast.error('❌ Erro ao atualizar aplicação');
    }
  };

  const handleClearCache = async () => {
    try {
      await clearCache();
      toast.success('🗑️ Cache limpo com sucesso!');
    } catch (error) {
      toast.error('❌ Erro ao limpar cache');
    }
  };

  const formatCacheSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Aplicação PWA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status de conectividade */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <Badge variant={isOnline ? 'default' : 'destructive'}>
            {isOnline ? 'Conectado' : 'Desconectado'}
          </Badge>
        </div>

        {/* Status de instalação */}
        <div className="flex items-center gap-2">
          <Badge variant={isInstalled ? 'default' : 'secondary'}>
            {isInstalled ? 'Instalado' : 'Não instalado'}
          </Badge>
          {isUpdateAvailable && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Atualização disponível
            </Badge>
          )}
        </div>

        {/* Tamanho do cache */}
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            Cache: {formatCacheSize(cacheSize)}
          </span>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-2">
          {isInstallable && !isInstalled && (
            <Button onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Instalar App
            </Button>
          )}

          {isUpdateAvailable && (
            <Button onClick={handleUpdate} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          )}

          <Button 
            onClick={handleClearCache} 
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Cache
          </Button>

          <Button 
            onClick={getCacheSize} 
            variant="ghost"
            size="sm"
          >
            Atualizar Cache
          </Button>
        </div>

        {/* Informações adicionais */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Instale o app para acesso rápido</p>
          <p>• Funciona offline após instalação</p>
          <p>• Notificações push disponíveis</p>
          <p>• Sincronização automática</p>
        </div>
      </CardContent>
    </Card>
  );
}

