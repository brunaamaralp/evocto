import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getFriendlyErrorMessage(error, entityName = 'item') {
    const defaultMessage = `Erro ao salvar ${entityName}. Tente novamente.`;

    if (!error) return defaultMessage;

    const message = error.message || '';
    const status = error.status;

    if (status === 409 || message.toLowerCase().includes('conflict')) {
        return `Este ${entityName} já existe ou está em conflito com outro. Verifique os dados.`;
    }
    if (status === 403 || message.toLowerCase().includes('forbidden')) {
        return `Você não tem permissão para modificar este ${entityName}.`;
    }
    if (status === 422 || message.toLowerCase().includes('invalid transition')) {
        return `Ação inválida. O estado atual do ${entityName} não permite esta operação.`;
    }
    if (status === 500) {
        return 'Erro interno do servidor. Nossa equipe foi notificada.';
    }
    return message || defaultMessage;
}


export default function SaveableForm({ 
  initialData, 
  onSave, 
  validate, 
  children,
  entityName = 'item',
  className = ''
}) {
  const [formData, setFormData] = useState(initialData);
  const [originalData, setOriginalData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const saveButtonRef = useRef(null);
  const isFirstRender = useRef(true);

  // Deep comparison to detect changes
  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Validation
  const validationErrors = validate ? validate(formData) : {};
  const isValid = Object.keys(validationErrors).length === 0;
  const canSave = isDirty && isValid && !saving;

  // Prevent double-click
  const [lastClickTime, setLastClickTime] = useState(0);

  useEffect(() => {
    if (!isFirstRender.current) {
      setOriginalData(initialData);
      setFormData(initialData);
    }
    isFirstRender.current = false;
  }, [JSON.stringify(initialData)]);

  const handleSave = async () => {
    const now = Date.now();
    
    // Prevent double-click (within 1 second)
    if (now - lastClickTime < 1000) {
      return;
    }
    setLastClickTime(now);

    if (!canSave) return;

    setSaving(true);
    
    try {
      const savedData = await onSave(formData);
      
      const newData = savedData || formData;
      setOriginalData(newData);
      setFormData(newData);
      setLastSaved(new Date());
      
      toast.success(`${entityName} salvo com sucesso!`);
      
    } catch (err) {
      const friendlyMessage = getFriendlyErrorMessage(err, entityName);
      toast.error('Falha ao Salvar', { description: friendlyMessage });
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ... (keyboard shortcut useEffect) ...
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (canSave) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canSave, formData]);


  return (
    <div className={`space-y-6 ${className}`}>
      {children({ formData, setFormData, validationErrors, isDirty, isValid })}
      
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <div className="flex items-center gap-3">
          {lastSaved && (
            <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
              <Clock className="w-3 h-3 mr-1" />
              Salvo há {formatDistanceToNow(lastSaved, { locale: ptBR })}
            </Badge>
          )}
          
          {isDirty && !isValid && (
            <Badge variant="destructive">
              Corrija os erros para salvar
            </Badge>
          )}
        </div>
        
        <Button
          ref={saveButtonRef}
          onClick={handleSave}
          disabled={!canSave}
          className="min-w-[140px]"
          title={
            !isDirty ? 'Nenhuma alteração para salvar' :
            !isValid ? 'Corrija os erros antes de salvar' :
            saving ? 'Salvando...' :
            'Salvar alterações (Ctrl+S)'
          }
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}