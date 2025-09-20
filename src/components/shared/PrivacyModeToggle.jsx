import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Toggle para modo privacidade - blur valores sensíveis
 */
export function PrivacyModeToggle() {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  useEffect(() => {
    // Aplicar classe CSS global para blur
    if (isPrivacyMode) {
      document.body.classList.add('privacy-mode');
    } else {
      document.body.classList.remove('privacy-mode');
    }
    
    // Cleanup
    return () => document.body.classList.remove('privacy-mode');
  }, [isPrivacyMode]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsPrivacyMode(!isPrivacyMode)}
      className="flex items-center gap-2"
      aria-label={isPrivacyMode ? 'Desativar modo privacidade' : 'Ativar modo privacidade'}
    >
      {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      {isPrivacyMode ? 'Modo Privado' : 'Modo Normal'}
    </Button>
  );
}

/**
 * Componente para valores sensíveis que respeitam modo privacidade
 */
export function SensitiveValue({ 
  value, 
  type = 'string', 
  blurLevel = 'md',
  className = "" 
}) {
  const getBlurClass = (level) => {
    const levels = {
      'sm': 'privacy-blur-sm',
      'md': 'privacy-blur-md', 
      'lg': 'privacy-blur-lg'
    };
    return levels[level] || 'privacy-blur-md';
  };

  const formatValue = (val, dataType) => {
    if (!val) return '--';
    
    switch (dataType) {
      case 'currency':
        return typeof val === 'number' 
          ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : val;
      case 'percentage':
        return typeof val === 'number' ? `${val}%` : val;
      case 'cnpj':
        return val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      default:
        return val;
    }
  };

  return (
    <span className={`${getBlurClass(blurLevel)} ${className}`}>
      {formatValue(value, type)}
    </span>
  );
}