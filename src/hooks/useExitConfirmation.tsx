/**
 * Confirmação de saída de formulários com alterações não salvas.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
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

export interface ExitConfirmationOptions {
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  /** Preferir false + ExitConfirmationModal (toast tem closure frágil). */
  showToast?: boolean;
}

export function useExitConfirmation(
  hasUnsavedChanges: boolean,
  options: ExitConfirmationOptions = {}
) {
  const [isConfirming, setIsConfirming] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const {
    message = 'Você tem alterações não salvas. Deseja realmente sair?',
    onConfirm,
    onCancel,
    showToast = false,
  } = options;

  const confirmExit = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setIsConfirming(false);
    action?.();
    onConfirm?.();
  }, [onConfirm]);

  const cancelExit = useCallback(() => {
    pendingActionRef.current = null;
    setIsConfirming(false);
    onCancel?.();
  }, [onCancel]);

  const handleExitAttempt = useCallback(
    (action: () => void) => {
      if (typeof action !== 'function') return;
      if (!hasUnsavedChanges) {
        action();
        return;
      }

      pendingActionRef.current = action;
      setIsConfirming(true);

      if (showToast) {
        toast.warning('Alterações não salvas', {
          description: message,
          action: {
            label: 'Sair mesmo assim',
            onClick: () => confirmExit(),
          },
          cancel: {
            label: 'Cancelar',
            onClick: () => cancelExit(),
          },
        });
      }
    },
    [hasUnsavedChanges, message, showToast, confirmExit, cancelExit]
  );

  /** Adapter para Radix Dialog: onOpenChange(boolean). */
  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean, closeAction?: () => void) => {
      if (nextOpen) return;
      handleExitAttempt(closeAction || (() => undefined));
    },
    [handleExitAttempt]
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message]);

  return {
    isConfirming,
    handleExitAttempt,
    handleDialogOpenChange,
    confirmExit,
    cancelExit,
  };
}

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
  onCancel,
}: ExitConfirmationModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>Confirmar Saída</span>
          </DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start">
          <Button onClick={onConfirm} variant="destructive" className="mr-2">
            Sair mesmo assim
          </Button>
          <Button onClick={onCancel} variant="outline">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
