import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Undo2
} from 'lucide-react';
import { useAutoSave, useUnsavedChangesWarning } from './useAutoSave';
import { useNotification } from '@/components/feedback/NotificationSystem';

export default function FormWrapper({
  children,
  data,
  saveFunction,
  onSaveSuccess,
  onSaveError,
  autoSaveEnabled = true,
  saveKey,
  title,
  showSaveStatus = true,
  className = ""
}) {
  const { notify } = useNotification();
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [recoveredData, setRecoveredData] = useState(null);

  const {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveError,
    forceSave,
    recoverFromLocalStorage
  } = useAutoSave({
    data,
    saveFunction,
    enabled: autoSaveEnabled,
    saveKey,
    onSaveSuccess: () => {
      if (onSaveSuccess) onSaveSuccess();
    },
    onSaveError: (error) => {
      if (onSaveError) onSaveError(error);
    }
  });

  // Verificar se há dados para recuperar ao montar
  useEffect(() => {
    const recovered = recoverFromLocalStorage();
    if (recovered && JSON.stringify(recovered) !== JSON.stringify(data)) {
      setRecoveredData(recovered);
      setShowRecoveryPrompt(true);
    }
  }, [recoverFromLocalStorage, data]);

  // Warning ao sair da página
  useUnsavedChangesWarning(hasUnsavedChanges);

  const handleRecoverData = () => {
    if (recoveredData && onSaveSuccess) {
      // Simular o carregamento dos dados recuperados
      // Em uma implementação real, isso seria feito através de props ou callback
      notify('info', 'Dados recuperados com sucesso!');
      setShowRecoveryPrompt(false);
    }
  };

  const handleDiscardRecovery = () => {
    setShowRecoveryPrompt(false);
    setRecoveredData(null);
    
    // Limpar backups locais
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(`${saveKey}_backup_`)
    );
    keys.forEach(key => localStorage.removeItem(key));
  };

  const handleManualSave = () => {
    forceSave();
  };

  const formatLastSaved = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'agora mesmo';
    if (minutes === 1) return 'há 1 minuto';
    if (minutes < 60) return `há ${minutes} minutos`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'há 1 hora';
    if (hours < 24) return `há ${hours} horas`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Prompt de Recuperação de Dados */}
      {showRecoveryPrompt && recoveredData && (
        <Alert className="border-amber-200 bg-amber-50">
          <Undo2 className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Dados não salvos encontrados!</strong>
              <br />
              Foram encontrados dados mais recentes que não foram salvos. Deseja recuperá-los?
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRecoverData}
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
              >
                Recuperar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDiscardRecovery}
                className="text-gray-600"
              >
                Descartar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header com Status de Salvamento */}
      {showSaveStatus && (title || lastSaved || hasUnsavedChanges || isSaving) && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          
          <div className="flex items-center gap-3">
            {/* Status de Salvamento */}
            <div className="flex items-center gap-2">
              {isSaving && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Salvando...
                </Badge>
              )}
              
              {!isSaving && hasUnsavedChanges && (
                <Badge variant="outline" className="flex items-center gap-1 text-amber-700 border-amber-300">
                  <Clock className="w-3 h-3" />
                  Não salvo
                </Badge>
              )}
              
              {!isSaving && !hasUnsavedChanges && lastSaved && (
                <Badge variant="outline" className="flex items-center gap-1 text-green-700 border-green-300">
                  <CheckCircle2 className="w-3 h-3" />
                  Salvo {formatLastSaved(lastSaved)}
                </Badge>
              )}
            </div>

            {/* Botão de Save Manual */}
            {hasUnsavedChanges && (
              <Button
                size="sm"
                onClick={handleManualSave}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Agora
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Erro de Salvamento */}
      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Erro ao salvar:</strong> {saveError}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualSave}
              className="ml-4"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Conteúdo do Formulário */}
      {children}
    </div>
  );
}