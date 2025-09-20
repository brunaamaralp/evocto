import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const AUTO_SAVE_DELAY = 2000; // 2 segundos de inatividade
const MAX_RETRY_ATTEMPTS = 3;

export function useAutoSave({
  data,
  saveFunction,
  enabled = true,
  onSaveSuccess,
  onSaveError,
  saveKey = 'autosave'
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  const timeoutRef = useRef(null);
  const lastDataRef = useRef(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  // Salvar no localStorage como backup
  const saveToLocalStorage = useCallback((data) => {
    try {
      const backupKey = `${saveKey}_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify({
        data,
        timestamp: Date.now(),
        saveKey
      }));
      
      // Limpar backups antigos (manter apenas os 5 mais recentes)
      const keys = Object.keys(localStorage).filter(key => key.startsWith(`${saveKey}_backup_`));
      if (keys.length > 5) {
        keys.sort().slice(0, -5).forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Erro ao salvar backup local:', error);
    }
  }, [saveKey]);

  // Recuperar do localStorage
  const recoverFromLocalStorage = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(`${saveKey}_backup_`));
      if (keys.length === 0) return null;
      
      const latestKey = keys.sort().pop();
      const backup = JSON.parse(localStorage.getItem(latestKey));
      
      // Verificar se o backup é recente (menos de 24h)
      const isRecent = Date.now() - backup.timestamp < 24 * 60 * 60 * 1000;
      
      return isRecent ? backup.data : null;
    } catch (error) {
      console.warn('Erro ao recuperar backup local:', error);
      return null;
    }
  }, [saveKey]);

  // Função de save com retry
  const performSave = useCallback(async (dataToSave) => {
    if (!enabled || !saveFunction || !mountedRef.current) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      
      await saveFunction(dataToSave);
      
      if (mountedRef.current) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setSaveError(null);
        retryCountRef.current = 0;
        
        // Limpar backup após save bem-sucedido
        const keys = Object.keys(localStorage).filter(key => key.startsWith(`${saveKey}_backup_`));
        keys.forEach(key => localStorage.removeItem(key));
        
        if (onSaveSuccess) onSaveSuccess();
        
        // Toast discreto de sucesso
        toast.success('Alterações salvas automaticamente', {
          duration: 1500,
          position: 'bottom-right'
        });
      }
    } catch (error) {
      console.error('Erro no auto-save:', error);
      
      if (mountedRef.current) {
        setSaveError(error.message);
        retryCountRef.current++;
        
        if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
          // Tentar novamente em 5 segundos
          setTimeout(() => {
            if (mountedRef.current) performSave(dataToSave);
          }, 5000);
          
          toast.warning(`Erro ao salvar (tentativa ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS}). Tentando novamente...`, {
            duration: 3000,
            position: 'bottom-right'
          });
        } else {
          // Salvar como backup local após esgotar tentativas
          saveToLocalStorage(dataToSave);
          
          toast.error('Não foi possível salvar automaticamente. Dados salvos localmente como backup.', {
            duration: 5000,
            position: 'bottom-right',
            action: {
              label: 'Tentar novamente',
              onClick: () => performSave(dataToSave)
            }
          });
        }
        
        if (onSaveError) onSaveError(error);
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [enabled, saveFunction, onSaveSuccess, onSaveError, saveToLocalStorage, saveKey]);

  // Verificar mudanças nos dados
  useEffect(() => {
    if (!enabled) return;
    
    const currentDataString = JSON.stringify(data);
    const lastDataString = JSON.stringify(lastDataRef.current);
    
    if (currentDataString !== lastDataString && lastDataRef.current !== null) {
      setHasUnsavedChanges(true);
      
      // Salvar backup local imediatamente
      saveToLocalStorage(data);
      
      // Cancelar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Agendar auto-save
      timeoutRef.current = setTimeout(() => {
        performSave(data);
      }, AUTO_SAVE_DELAY);
    }
    
    lastDataRef.current = data;
  }, [data, enabled, performSave, saveToLocalStorage]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Save manual forçado
  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    performSave(data);
  }, [data, performSave]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveError,
    forceSave,
    recoverFromLocalStorage
  };
}

// Hook para notificar sobre mudanças não salvas ao sair da página
export function useUnsavedChangesWarning(hasUnsavedChanges) {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}