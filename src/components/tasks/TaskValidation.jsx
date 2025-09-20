import React from 'react';
import { CheckCircle, Circle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Componente para validar se uma fase pode ser concluída
 * baseado nos critérios de conclusão definidos
 */
export function PhaseCompletionValidator({ deliverable, onValidationChange }) {
  const [checkedCriteria, setCheckedCriteria] = React.useState({});

  const criteria = deliverable.completion_criteria || [];
  const checkedCount = Object.values(checkedCriteria).filter(Boolean).length;
  const isComplete = checkedCount === criteria.length && criteria.length > 0;

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isComplete);
    }
  }, [isComplete, onValidationChange]);

  const toggleCriterion = (index) => {
    setCheckedCriteria(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (criteria.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-medium">Nenhum critério de conclusão definido</p>
              <p className="text-sm text-amber-600">
                Esta fase não possui critérios de validação configurados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isComplete ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Critérios de Conclusão</h4>
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {checkedCount}/{criteria.length} concluído{checkedCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="space-y-3">
          {criteria.map((criterion, index) => {
            const isChecked = checkedCriteria[index];
            
            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  isChecked 
                    ? 'bg-green-100 border-green-200' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                } border`}
                onClick={() => toggleCriterion(index)}
              >
                {isChecked ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
                
                <span className={`flex-1 ${isChecked ? 'text-green-800 line-through' : 'text-gray-700'}`}>
                  {criterion}
                </span>
              </div>
            );
          })}
        </div>

        {isComplete && (
          <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Todos os critérios foram atendidos! Esta fase pode ser marcada como concluída.
              </span>
            </div>
          </div>
        )}

        {deliverable.expected_outcome && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="text-sm font-medium text-blue-900 mb-1">Resultado Esperado:</h5>
            <p className="text-sm text-blue-800">{deliverable.expected_outcome}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Hook para validar se uma fase pode ser concluída
 */
export function usePhaseValidation(deliverable) {
  const [isValid, setIsValid] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState([]);

  React.useEffect(() => {
    const errors = [];
    const criteria = deliverable.completion_criteria || [];

    if (criteria.length === 0) {
      errors.push('Nenhum critério de conclusão definido');
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [deliverable]);

  return {
    isValid,
    validationErrors,
    canComplete: isValid
  };
}

export default PhaseCompletionValidator;