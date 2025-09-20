import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Modal genérico para criação de entidades
 * Substitui múltiplos modais duplicados no sistema
 */
export default function EntityCreateModal({
  isOpen,
  onClose,
  title,
  fields,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Criar",
  children
}) {
  const [formData, setFormData] = useState(() => {
    const initialData = {};
    fields?.forEach(field => {
      initialData[field.name] = field.defaultValue || '';
    });
    return initialData;
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Limpar erro do campo quando usuário digita
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    fields?.forEach(field => {
      if (field.required && !formData[field.name]?.trim()) {
        newErrors[field.name] = `${field.label} é obrigatório`;
      }
      
      if (field.validation && formData[field.name]) {
        const validationError = field.validation(formData[field.name]);
        if (validationError) {
          newErrors[field.name] = validationError;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      await onSubmit(formData);
      
      // Reset form
      const resetData = {};
      fields?.forEach(field => {
        resetData[field.name] = field.defaultValue || '';
      });
      setFormData(resetData);
      setErrors({});
      
    } catch (error) {
      console.error('Erro ao criar entidade:', error);
      toast.error(error.message || 'Erro ao criar registro');
    }
  };

  const renderField = (field) => {
    const commonProps = {
      id: field.name,
      value: formData[field.name] || '',
      onChange: (e) => handleInputChange(field.name, e.target.value),
      placeholder: field.placeholder,
      className: errors[field.name] ? 'border-red-500' : ''
    };

    switch (field.type) {
      case 'textarea':
        return <Textarea {...commonProps} rows={field.rows || 3} />;
      case 'email':
        return <Input {...commonProps} type="email" />;
      case 'tel':
        return <Input {...commonProps} type="tel" />;
      case 'number':
        return <Input {...commonProps} type="number" />;
      default:
        return <Input {...commonProps} type="text" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields?.map(field => (
              <div key={field.name}>
                <Label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {renderField(field)}
                {errors[field.name] && (
                  <p className="text-red-500 text-sm mt-1">{errors[field.name]}</p>
                )}
              </div>
            ))}
            
            {children}
            
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Salvando...' : submitLabel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}