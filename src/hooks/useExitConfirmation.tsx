/**
 * 🚪 Hook para Confirmação de Saída de Formulários
 * 
 * Implementa confirmação antes de sair de formulários com dados não salvos
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface ExitConfirmationOptions {
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showToast?: boolean;
}

export function useExitConfirmation(
  hasUnsavedChanges: boolean,
  options: ExitConfirmationOptions = {}
) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const {
    message = 'Você tem alterações não salvas. Deseja realmente sair?',
    onConfirm,
    onCancel,
    showToast = true
  } = options;

  // Interceptar tentativas de saída
  const handleExitAttempt = useCallback((action: () => void) => {
    if (!hasUnsavedChanges) {
      // Sem alterações, pode sair diretamente
      action();
      return;
    }

    // Com alterações, mostrar confirmação
    setIsConfirming(true);
    setPendingAction(() => action);

    if (showToast) {
      toast.warning('Alterações não salvas', {
        description: message,
        action: {
          label: 'Sair mesmo assim',
          onClick: () => confirmExit()
        },
        cancel: {
          label: 'Cancelar',
          onClick: () => cancelExit()
        }
      });
    }
  }, [hasUnsavedChanges, message, showToast]);

  // Confirmar saída
  const confirmExit = useCallback(() => {
    setIsConfirming(false);
    
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }

    if (onConfirm) {
      onConfirm();
    }
  }, [pendingAction, onConfirm]);

  // Cancelar saída
  const cancelExit = useCallback(() => {
    setIsConfirming(false);
    setPendingAction(null);

    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Interceptar fechamento da janela/aba
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

  // Interceptar navegação (para SPAs)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        handleExitAttempt(() => {
          // Forçar navegação após confirmação
          window.history.pushState(null, '', window.location.href);
          window.location.reload();
        });
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, handleExitAttempt]);

  return {
    isConfirming,
    handleExitAttempt,
    confirmExit,
    cancelExit
  };
}

/**
 * 🎨 Componente de Modal de Confirmação
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitConfirmationModal({
  isOpen,
  message = 'Você tem alterações não salvas. Deseja realmente sair?',
  onConfirm,
  onCancel
}: ExitConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>Confirmar Saída</span>
          </DialogTitle>
          <DialogDescription>
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start">
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="mr-2"
          >
            Sair mesmo assim
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}