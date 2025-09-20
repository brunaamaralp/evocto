import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Info, Upload, Eye, User, Calendar } from 'lucide-react';

/**
 * Tooltip que mostra a proveniência/origem dos dados
 * Essencial para rastreabilidade no MVP
 */
export default function ProvenanceTooltip({ 
  sourceFile = 'unknown',
  extractedBy = 'Sistema',
  extractedAt,
  confidence = 0,
  method = 'llm_extraction',
  reviewStatus = 'auto_approved',
  className = "",
  size = "sm"
}) {
  const getMethodLabel = (method) => {
    const methods = {
      'llm_extraction': 'Extração por IA',
      'csv_parser': 'Parser CSV',
      'pdf_ocr': 'OCR PDF',
      'manual_entry': 'Entrada Manual',
      'api_import': 'Importação API'
    };
    return methods[method] || method;
  };

  const getStatusColor = (status) => {
    const colors = {
      'auto_approved': 'bg-green-100 text-green-800',
      'manually_approved': 'bg-blue-100 text-blue-800',
      'pending_review': 'bg-yellow-100 text-yellow-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'auto_approved': 'Auto-aprovado',
      'manually_approved': 'Aprovado manualmente',
      'pending_review': 'Pendente revisão',
      'rejected': 'Rejeitado'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size={size}
          className={`p-1 h-auto text-gray-400 hover:text-gray-600 ${className}`}
          title="Ver origem dos dados"
        >
          <Info className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <h4 className="font-medium">Proveniência dos Dados</h4>
          </div>
          
          {/* Arquivo de origem */}
          <div className="flex items-start gap-2 text-sm">
            <Upload className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Arquivo:</div>
              <div className="text-gray-600 break-all">{sourceFile}</div>
            </div>
          </div>

          {/* Método de extração */}
          <div className="flex items-start gap-2 text-sm">
            <Eye className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Método:</div>
              <div className="text-gray-600">{getMethodLabel(method)}</div>
            </div>
          </div>

          {/* Extraído por */}
          <div className="flex items-start gap-2 text-sm">
            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Extraído por:</div>
              <div className="text-gray-600">{extractedBy}</div>
            </div>
          </div>

          {/* Data de extração */}
          <div className="flex items-start gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Data:</div>
              <div className="text-gray-600">{formatDate(extractedAt)}</div>
            </div>
          </div>

          {/* Confiança e status */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <div className="text-xs text-gray-500">Confiança:</div>
              <div className={`text-sm font-medium ${
                confidence >= 80 ? 'text-green-600' : 
                confidence >= 60 ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {confidence}%
              </div>
            </div>
            <Badge className={getStatusColor(reviewStatus)}>
              {getStatusLabel(reviewStatus)}
            </Badge>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}