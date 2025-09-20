
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Database,
  Download,
  Upload,
  RefreshCw,
  Shield,
  Clock,
  Archive,
  RotateCcw,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  FileArchive
} from 'lucide-react';
import { FinancialKPI } from '@/api/entities';
import { KPIFormulaDefinition } from '@/api/entities';

const BACKUP_FREQUENCIES = [
  { value: 'daily', label: 'Diário', description: 'Backup automático todo dia' },
  { value: 'weekly', label: 'Semanal', description: 'Backup toda semana' },
  { value: 'monthly', label: 'Mensal', description: 'Backup todo mês' },
  { value: 'manual', label: 'Manual', description: 'Apenas backups manuais' }
];

const RETENTION_POLICIES = [
  { value: '30d', label: '30 dias', description: 'Manter por 30 dias' },
  { value: '90d', label: '90 dias', description: 'Manter por 3 meses' },
  { value: '1y', label: '1 ano', description: 'Manter por 1 ano' },
  { value: 'forever', label: 'Permanente', description: 'Manter permanentemente' }
];

export default function KPIBackupSystem({ 
  clientId, 
  serviceId,
  onBackupComplete,
  onRestoreComplete,
  className = "" 
}) {
  const [backupConfig, setBackupConfig] = useState({
    enabled: false,
    frequency: 'weekly',
    retentionPolicy: '90d',
    includeHistorical: true,
    includeFormulas: true,
    compressBackups: true,
    encryptBackups: false
  });

  const [backupHistory, setBackupHistory] = useState([]);
  const [restorePoints, setRestorePoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedRestore, setSelectedRestore] = useState(null);

  const loadBackupData = useCallback(async () => {
    try {
      setLoading(true);

      // Mock dos dados de backup
      const mockBackups = [
        {
          id: 'backup_001',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          type: 'automatic',
          size: '2.4 MB',
          kpiCount: 15,
          status: 'completed',
          retentionUntil: new Date(Date.now() + 90 * 86400000).toISOString()
        },
        {
          id: 'backup_002',
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          type: 'manual',
          size: '2.1 MB',
          kpiCount: 14,
          status: 'completed',
          retentionUntil: new Date(Date.now() + 90 * 86400000).toISOString()
        }
      ];

      setBackupHistory(mockBackups);
      setRestorePoints(mockBackups.filter(b => b.status === 'completed'));

    } catch (err) {
      console.error('Erro ao carregar dados de backup:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackupData();
  }, [loadBackupData]);

  const createBackup = async (isManual = false) => {
    try {
      setCreating(true);
      setProgress(0);

      // Simular progresso de backup
      const steps = [
        'Coletando KPIs...',
        'Exportando históricos...',
        'Incluindo fórmulas...',
        'Comprimindo dados...',
        'Salvando backup...'
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProgress(((i + 1) / steps.length) * 100);
      }

      // Simular criação de backup
      const newBackup = {
        id: `backup_${Date.now()}`,
        createdAt: new Date().toISOString(),
        type: isManual ? 'manual' : 'automatic',
        size: '2.6 MB',
        kpiCount: 16,
        status: 'completed',
        retentionUntil: new Date(Date.now() + 90 * 86400000).toISOString()
      };

      setBackupHistory(prev => [newBackup, ...prev]);
      setRestorePoints(prev => [newBackup, ...prev]);

      if (onBackupComplete) {
        onBackupComplete(newBackup);
      }

    } catch (err) {
      console.error('Erro ao criar backup:', err);
    } finally {
      setCreating(false);
      setProgress(0);
    }
  };

  const restoreFromBackup = async (backup) => {
    if (!backup) return;

    try {
      setRestoring(true);
      setProgress(0);

      const steps = [
        'Validando backup...',
        'Criando snapshot atual...',
        'Restaurando KPIs...',
        'Restaurando históricos...',
        'Atualizando referências...'
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setProgress(((i + 1) / steps.length) * 100);
      }

      if (onRestoreComplete) {
        onRestoreComplete(backup);
      }

    } catch (err) {
      console.error('Erro ao restaurar backup:', err);
    } finally {
      setRestoring(false);
      setProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuração de Backup */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <CardTitle>Configuração de Backup</CardTitle>
            </div>
            <Switch
              checked={backupConfig.enabled}
              onCheckedChange={(enabled) =>
                setBackupConfig(prev => ({ ...prev, enabled }))
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">Frequência</Label>
              <Select
                value={backupConfig.frequency}
                onValueChange={(frequency) =>
                  setBackupConfig(prev => ({ ...prev, frequency }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar frequência" />
                </SelectTrigger>
                <SelectContent>
                  {BACKUP_FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      <div>
                        <div className="font-medium">{freq.label}</div>
                        <div className="text-sm text-gray-500">{freq.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="retention">Retenção</Label>
              <Select
                value={backupConfig.retentionPolicy}
                onValueChange={(retentionPolicy) =>
                  setBackupConfig(prev => ({ ...prev, retentionPolicy }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Política de retenção" />
                </SelectTrigger>
                <SelectContent>
                  {RETENTION_POLICIES.map(policy => (
                    <SelectItem key={policy.value} value={policy.value}>
                      <div>
                        <div className="font-medium">{policy.label}</div>
                        <div className="text-sm text-gray-500">{policy.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Incluir dados históricos</Label>
              <Switch
                checked={backupConfig.includeHistorical}
                onCheckedChange={(includeHistorical) =>
                  setBackupConfig(prev => ({ ...prev, includeHistorical }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Incluir fórmulas de cálculo</Label>
              <Switch
                checked={backupConfig.includeFormulas}
                onCheckedChange={(includeFormulas) =>
                  setBackupConfig(prev => ({ ...prev, includeFormulas }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Compressão automática</Label>
              <Switch
                checked={backupConfig.compressBackups}
                onCheckedChange={(compressBackups) =>
                  setBackupConfig(prev => ({ ...prev, compressBackups }))
                }
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => createBackup(true)}
              disabled={creating}
            >
              {creating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              Criar Backup Manual
            </Button>

            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar Configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progresso do Backup/Restore */}
      {(creating || restoring) && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {creating ? 'Criando backup...' : 'Restaurando backup...'}
                </span>
                <span className="text-sm text-gray-500">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Backups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Archive className="w-5 h-5 text-green-600" />
              <CardTitle>Histórico de Backups</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBackupData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backupHistory.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileArchive className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {new Date(backup.createdAt).toLocaleString('pt-BR')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {backup.kpiCount} KPIs • {backup.size} • {backup.type}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge className={getStatusColor(backup.status)}>
                    {backup.status === 'completed' ? 'Concluído' : backup.status}
                  </Badge>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreFromBackup(backup)}
                      disabled={restoring}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restaurar
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {backupHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum backup encontrado</p>
                <p className="text-sm">Crie seu primeiro backup manual</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
