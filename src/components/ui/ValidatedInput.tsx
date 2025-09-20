/**
 * 🎯 Componente de Input com Validação em Tempo Real
 * 
 * Componente reutilizável com validação automática e feedback visual
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidatedInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  validate?: (value: string) => string | null;
  format?: (value: string) => string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  debounceMs?: number;
  showSuccessIcon?: boolean;
  showErrorIcon?: boolean;
}

export function ValidatedInput({
  id,
  label,
  value,
  onChange,
  validate,
  format,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
  className,
  debounceMs = 300,
  showSuccessIcon = true,
  showErrorIcon = true
}: ValidatedInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  // Debounced validation
  const debouncedValidate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (value: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (validate) {
            setIsValidating(true);
            const error = validate(value);
            setError(error);
            setIsValidating(false);
          }
        }, debounceMs);
      };
    })(),
    [validate, debounceMs]
  );

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    let formattedValue = newValue;
    
    // Apply formatting if provided
    if (format) {
      formattedValue = format(newValue);
    }
    
    onChange(formattedValue);
    
    // Mark as touched
    if (!hasBeenTouched) {
      setHasBeenTouched(true);
    }
    
    // Validate if function provided
    if (validate) {
      debouncedValidate(formattedValue);
    }
  }, [onChange, format, validate, debouncedValidate, hasBeenTouched]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setHasBeenTouched(true);
    if (validate) {
      const error = validate(value);
      setError(error);
    }
  }, [validate, value]);

  // Clear error when value becomes empty and field is not required
  useEffect(() => {
    if (!required && !value.trim() && error) {
      setError(null);
    }
  }, [value, required, error]);

  // Determine input state
  const hasError = hasBeenTouched && error;
  const hasSuccess = hasBeenTouched && !error && value.trim() && !isValidating;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pr-10',
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            hasSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500',
            className
          )}
        />
        
        {/* Icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isValidating && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
          {!isValidating && hasError && showErrorIcon && (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          {!isValidating && hasSuccess && showSuccessIcon && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>
      </div>
      
      {/* Error message */}
      {hasError && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// Componente específico para CNPJ
interface CNPJInputProps extends Omit<ValidatedInputProps, 'format' | 'validate'> {
  onCNPJChange?: (cnpj: string) => void;
}

export function CNPJInput({ onCNPJChange, ...props }: CNPJInputProps) {
  // Formatar CNPJ
  const formatCNPJ = useCallback((value: string): string => {
    const cleanCNPJ = value.replace(/\D/g, '');
    return cleanCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }, []);

  // Validar CNPJ
  const validateCNPJ = useCallback((cnpj: string): string | null => {
    if (!cnpj) return null; // CNPJ é opcional
    
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    // Verificar se tem 14 dígitos
    if (cleanCNPJ.length !== 14) {
      return 'CNPJ deve ter 14 dígitos';
    }
    
    // Verificar se não são todos iguais
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
      return 'CNPJ inválido';
    }
    
    // Validação dos dígitos verificadores
    let sum = 0;
    let weight = 5;
    
    // Primeiro dígito verificador
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(cleanCNPJ[12]) !== firstDigit) {
      return 'CNPJ inválido';
    }
    
    // Segundo dígito verificador
    sum = 0;
    weight = 6;
    
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(cleanCNPJ[13]) !== secondDigit) {
      return 'CNPJ inválido';
    }
    
    return null;
  }, []);

  const handleChange = useCallback((value: string) => {
    props.onChange(value);
    onCNPJChange?.(value);
  }, [props.onChange, onCNPJChange]);

  return (
    <ValidatedInput
      {...props}
      onChange={handleChange}
      format={formatCNPJ}
      validate={validateCNPJ}
      placeholder="00.000.000/0000-00"
    />
  );
}

// Componente específico para telefone
interface PhoneInputProps extends Omit<ValidatedInputProps, 'format' | 'validate'> {
  onPhoneChange?: (phone: string) => void;
}

export function PhoneInput({ onPhoneChange, ...props }: PhoneInputProps) {
  // Formatar telefone
  const formatPhone = useCallback((value: string): string => {
    const cleanPhone = value.replace(/\D/g, '');
    if (cleanPhone.length <= 10) {
      return cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    } else {
      return cleanPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
  }, []);

  // Validar telefone
  const validatePhone = useCallback((phone: string): string | null => {
    if (!phone) return null; // Telefone é opcional
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return 'Telefone deve ter pelo menos 10 dígitos';
    }
    
    if (cleanPhone.length > 11) {
      return 'Telefone deve ter no máximo 11 dígitos';
    }
    
    return null;
  }, []);

  const handleChange = useCallback((value: string) => {
    props.onChange(value);
    onPhoneChange?.(value);
  }, [props.onChange, onPhoneChange]);

  return (
    <ValidatedInput
      {...props}
      onChange={handleChange}
      format={formatPhone}
      validate={validatePhone}
      placeholder="(00) 0000-0000"
    />
  );
}

// Componente específico para email
interface EmailInputProps extends Omit<ValidatedInputProps, 'validate'> {
  onEmailChange?: (email: string) => void;
}

export function EmailInput({ onEmailChange, ...props }: EmailInputProps) {
  // Validar email
  const validateEmail = useCallback((email: string): string | null => {
    if (!email) return 'Email é obrigatório';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Email deve ter formato válido';
    }
    
    return null;
  }, []);

  const handleChange = useCallback((value: string) => {
    const lowercaseValue = value.toLowerCase();
    props.onChange(lowercaseValue);
    onEmailChange?.(lowercaseValue);
  }, [props.onChange, onEmailChange]);

  return (
    <ValidatedInput
      {...props}
      onChange={handleChange}
      validate={validateEmail}
      type="email"
      placeholder="exemplo@empresa.com"
    />
  );
}

