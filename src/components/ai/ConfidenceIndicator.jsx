import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from 'framer-motion';

/**
 * Indicador visual de confiança da IA com thresholds configuráveis
 */

const CONFIDENCE_LEVELS = {
  HIGH: { min: 80, label: 'Alta Confiança', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  MEDIUM: { min: 60, label: 'Confiança Moderada', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
  LOW: { min: 0, label: 'Baixa Confiança', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle }
};

const getConfidenceLevel = (score) => {
  if (score >= CONFIDENCE_LEVELS.HIGH.min) return CONFIDENCE_LEVELS.HIGH;
  if (score >= CONFIDENCE_LEVELS.MEDIUM.min) return CONFIDENCE_LEVELS.MEDIUM;
  return CONFIDENCE_LEVELS.LOW;
};

const getConfidenceMessage = (score, level, context = '') => {
  const contextSuffix = context ? ` para ${context}` : '';
  
  if (level === CONFIDENCE_LEVELS.HIGH) {
    return `A IA tem alta confiança (${score}%) neste resultado${contextSuffix}. Pode ser usado diretamente.`;
  }
  if (level === CONFIDENCE_LEVELS.MEDIUM) {
    return `A IA tem confiança moderada (${score}%) neste resultado${contextSuffix}. Recomendamos revisão antes do uso.`;
  }
  return `A IA tem baixa confiança (${score}%) neste resultado${contextSuffix}. Revisão manual é obrigatória.`;
};

export default function ConfidenceIndicator({ 
  score, 
  threshold = 75, 
  context = '',
  showDetails = true,
  compact = false,
  onReviewRequired,
  className = ''
}) {
  // Validação de entrada
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-gray-500">
              <HelpCircle className="w-3 h-3 mr-1" />
              Score N/A
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Score de confiança não disponível para este item.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const level = getConfidenceLevel(score);
  const Icon = level.icon;
  const message = getConfidenceMessage(score, level, context);
  const isLowConfidence = score < threshold;
  
  // React quando confiança é baixa
  React.useEffect(() => {
    if (isLowConfidence && onReviewRequired) {
      onReviewRequired(score, context);
    }
  }, [score, isLowConfidence, onReviewRequired, context]);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className={`inline-flex items-center ${className}`}
            >
              <Badge className={`${level.color} border text-xs`}>
                <Icon className="w-3 h-3 mr-1" />
                {score}%
              </Badge>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Indicador Principal */}
      <div className="flex items-center gap-2">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Badge className={`${level.color} border flex items-center gap-1`}>
            <Icon className="w-3 h-3" />
            <span className="font-medium">{level.label}</span>
            <span className="text-xs opacity-75">({score}%)</span>
          </Badge>
        </motion.div>
        
        {/* Barra de Progresso Visual */}
        <div className="flex-1 max-w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full ${
              score >= 80 ? 'bg-green-500' : 
              score >= 60 ? 'bg-yellow-500' : 
              'bg-red-500'
            }`}
          />
        </div>
      </div>

      {/* Alerta para Baixa Confiança */}
      {isLowConfidence && showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <Alert variant="destructive" className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Revisão Recomendada:</strong> {message}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Detalhes Expandidos */}
      {showDetails && !isLowConfidence && (
        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Hook personalizado para trabalhar com confidence scores
 */
export const useConfidenceTracking = (items = []) => {
  const lowConfidenceItems = items.filter(item => 
    item.confidence_score && item.confidence_score < 75
  );
  
  const averageConfidence = items.length > 0 
    ? items.reduce((acc, item) => acc + (item.confidence_score || 0), 0) / items.length
    : 0;
  
  const needsReview = lowConfidenceItems.length > 0;
  
  return {
    lowConfidenceItems,
    lowConfidenceCount: lowConfidenceItems.length,
    averageConfidence: Math.round(averageConfidence),
    needsReview,
    totalItems: items.length
  };
};

/**
 * Componente de resumo de confiança para listas
 */
export const ConfidenceSummary = ({ items, title = "Itens" }) => {
  const { lowConfidenceCount, averageConfidence, totalItems, needsReview } = useConfidenceTracking(items);
  
  if (totalItems === 0) return null;
  
  return (
    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">{title}:</span>
        <ConfidenceIndicator score={averageConfidence} compact />
      </div>
      
      {needsReview && (
        <div className="flex items-center gap-1 text-xs text-yellow-600">
          <AlertTriangle className="w-3 h-3" />
          <span>{lowConfidenceCount} precisam de revisão</span>
        </div>
      )}
      
      <span className="text-xs text-slate-500 ml-auto">
        {totalItems} item{totalItems !== 1 ? 's' : ''} total
      </span>
    </div>
  );
};