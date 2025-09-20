import React, { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ValidationManager({ 
  responses, 
  questions, 
  requiredErrors, 
  onValidationChange 
}) {
  const validationResults = useMemo(() => {
    const results = {
      errors: [],
      warnings: [],
      suggestions: [],
      progress: { completed: 0, total: 0, percentage: 0 }
    };

    questions.forEach(question => {
      const response = responses[question.id];
      const isEmpty = !response || (typeof response === 'string' && response.trim() === '');
      
      results.progress.total++;
      
      if (!isEmpty) {
        results.progress.completed++;
        
        // Validações específicas por tipo
        if (question.type === 'email' && response) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(response)) {
            results.errors.push({
              questionId: question.id,
              message: 'Email inválido',
              severity: 'error'
            });
          }
        }
        
        if (question.type === 'long_text' && response) {
          if (response.length < 10) {
            results.warnings.push({
              questionId: question.id,
              message: 'Resposta muito curta. Tente ser mais específico.',
              severity: 'warning'
            });
          } else if (response.length > 1000) {
            results.warnings.push({
              questionId: question.id,
              message: 'Resposta muito longa. Considere ser mais conciso.',
              severity: 'warning'
            });
          }
        }
        
        if (question.type === 'short_text' && response) {
          if (response.length < 2) {
            results.warnings.push({
              questionId: question.id,
              message: 'Resposta muito curta',
              severity: 'warning'
            });
          }
        }
        
        if (question.type === 'number' && response) {
          if (isNaN(Number(response)) || Number(response) < 0) {
            results.errors.push({
              questionId: question.id,
              message: 'Digite um número válido',
              severity: 'error'
            });
          }
        }
        
        if (question.type === 'currency' && response) {
          const cleanValue = response.replace(/[^\d,.-]/g, '');
          if (isNaN(Number(cleanValue.replace(',', '.')))) {
            results.errors.push({
              questionId: question.id,
              message: 'Valor monetário inválido',
              severity: 'error'
            });
          }
        }
        
        // Sugestões inteligentes
        if (question.id.includes('desafios') && response && response.length > 50) {
          const commonChallenges = ['fluxo de caixa', 'custos', 'receita', 'planejamento'];
          const mentioned = commonChallenges.filter(challenge => 
            response.toLowerCase().includes(challenge)
          );
          
          if (mentioned.length === 0) {
            results.suggestions.push({
              questionId: question.id,
              message: 'Considere mencionar aspectos como: fluxo de caixa, gestão de custos, ou planejamento financeiro.',
              severity: 'info'
            });
          }
        }
        
        if (question.id.includes('faturamento') && response) {
          const hasNumbers = /\d/.test(response);
          if (!hasNumbers) {
            results.suggestions.push({
              questionId: question.id,
              message: 'Incluir números aproximados pode ajudar na análise.',
              severity: 'info'
            });
          }
        }
        
      } else if (question.required) {
        results.errors.push({
          questionId: question.id,
          message: 'Este campo é obrigatório',
          severity: 'error'
        });
      }
    });

    results.progress.percentage = results.progress.total > 0 
      ? Math.round((results.progress.completed / results.progress.total) * 100) 
      : 0;

    return results;
  }, [responses, questions]);

  // Notificar mudanças de validação
  React.useEffect(() => {
    onValidationChange?.(validationResults);
  }, [validationResults, onValidationChange]);

  const getValidationIcon = (severity) => {
    switch (severity) {
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <CheckCircle2 className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getValidationColor = (severity) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-amber-200 bg-amber-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (validationResults.errors.length === 0 && 
      validationResults.warnings.length === 0 && 
      validationResults.suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Erros */}
      {validationResults.errors.map((error, index) => (
        <Alert key={`error-${index}`} className={getValidationColor('error')}>
          {getValidationIcon('error')}
          <AlertDescription className="flex items-center justify-between">
            <span>{error.message}</span>
            <Badge variant="destructive" className="text-xs">
              Erro
            </Badge>
          </AlertDescription>
        </Alert>
      ))}

      {/* Avisos */}
      {validationResults.warnings.map((warning, index) => (
        <Alert key={`warning-${index}`} className={getValidationColor('warning')}>
          {getValidationIcon('warning')}
          <AlertDescription className="flex items-center justify-between">
            <span>{warning.message}</span>
            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
              Aviso
            </Badge>
          </AlertDescription>
        </Alert>
      ))}

      {/* Sugestões */}
      {validationResults.suggestions.map((suggestion, index) => (
        <Alert key={`suggestion-${index}`} className={getValidationColor('info')}>
          {getValidationIcon('info')}
          <AlertDescription className="flex items-center justify-between">
            <span>{suggestion.message}</span>
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
              Dica
            </Badge>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}