
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LearningEntry } from '@/api/entities';
import LearningApplicationModal from './LearningApplicationModal';
import LearningPromotionModal from './LearningPromotionModal';
import { useLearningManagement } from '@/hooks/useLearningManagement';
import {
  Eye,
  Share2,
  TrendingUp,
  BookCopy,
  Calendar,
  Lightbulb,
  BarChart3,
  FileText,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Globe,
  Lock,
  GitBranchPlus,
  Send,
  Download,
  Rocket,
  AlertTriangle,
  ThumbsUp,
  Archive,
  FileInput,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfidenceIndicator from '@/components/ai/ConfidenceIndicator';

const sourceIcons = {
  briefing: FileText,
  meeting: MessageSquare,
  execution: TrendingUp,
  feedback: MessageSquare,
  manual: BookCopy,
  auto: Sparkles,
  auto_upload: Sparkles,
  workorder: BarChart3
};

const confidenceColors = {
  high: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-red-100 text-red-800 border-red-200'
};

export default function LearningCard({ 
  learning, 
  clientName, 
  showGlobalActions = false, 
  showReviewActions = false,
  onUpdate, 
  onPromote 
}) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  
  const {
    validateLearning,
    archiveLearning,
    applyLearningToBriefing,
    applyLearningToCycle,
    promoteToPlaybook
  } = useLearningManagement();

  const SourceIcon = sourceIcons[learning.sourceType] || FileText;

  const handleConfidenceReview = (score, context) => {
    setNeedsReview(true);
    console.log(`Review required for score ${score} in context: ${context}`);
  };

  const getConfidenceLevel = (score) => {
    if (!score || score < 60) return 'low';
    if (score >= 80) return 'high';
    return 'medium';
  };

  const confidenceLevel = getConfidenceLevel(learning.confidence_score);
  const confidenceColor = confidenceColors[confidenceLevel];

  const handleValidateLearning = async () => {
    try {
      await validateLearning(learning.id);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao validar aprendizado:', error);
    }
  };

  const handleArchiveLearning = async () => {
    try {
      await archiveLearning(learning.id);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao arquivar aprendizado:', error);
    }
  };

  const handleApplyToBriefing = () => {
    setShowApplicationModal(true);
  };

  const handleApplyToCycle = () => {
    setShowApplicationModal(true);
  };

  const handlePromoteClick = () => {
    setShowPromotionModal(true);
  };

  const handleApplicationSuccess = () => {
    setShowApplicationModal(false);
    if (onUpdate) onUpdate();
  };

  const handlePromotionSuccess = () => {
    setShowPromotionModal(false);
    if (onUpdate) onUpdate();
  };

  const formatMetrics = (resultJSON) => {
    if (!resultJSON || typeof resultJSON !== 'object') return null;

    const metrics = [];
    if (resultJSON.ctr) metrics.push(`CTR: ${resultJSON.ctr}%`);
    if (resultJSON.cpl) metrics.push(`CPL: R$${resultJSON.cpl}`);
    if (resultJSON.conversion_rate) metrics.push(`Taxa de Conversão: ${resultJSON.conversion_rate}%`);
    if (resultJSON.impressions) metrics.push(`Impressões: ${resultJSON.impressions.toLocaleString()}`);

    return metrics.length > 0 ? metrics.join(' • ') : null;
  };

  const metrics = formatMetrics(learning.resultJSON);

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`h-full flex flex-col transition-all duration-300 hover:shadow-xl bg-white ${
          !learning.reviewed ? 'border-l-4 border-l-amber-400' : 
          needsReview ? 'border-l-4 border-l-red-400' :
          'border-l-4 border-l-[hsl(var(--ev-cyan-turquoise))]'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-semibold text-slate-900 line-clamp-2">
                {learning.title}
              </CardTitle>
              <div className="flex items-center gap-1 shrink-0">
                <Tooltip>
                  <TooltipTrigger>
                    {learning.isShared ? (
                      <Globe className="w-4 h-4 text-[hsl(var(--ev-accent-purple))]" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>{learning.isShared ? 'Boa prática da agência' : 'Aprendizado do cliente'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    {!learning.reviewed ? <AlertCircle className="w-4 h-4 text-amber-500" /> : 
                     needsReview ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                     <CheckCircle2 className="w-4 h-4 text-green-500"/>}
                  </TooltipTrigger>
                  <TooltipContent>
                    {!learning.reviewed ? "Precisa de revisão" : 
                     needsReview ? "Precisa de revisão (baixa confiança)" :
                     "Revisado e validado"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <SourceIcon className="w-3 h-3" />
              <span className="capitalize">{learning.sourceType === 'auto_upload' ? 'Upload IA' : learning.sourceType}</span>
              <span>•</span>
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(learning.created_date), 'dd/MM/yy', { locale: ptBR })}</span>
              {clientName && (
                <>
                  <span>•</span>
                  <span className="font-medium">{clientName}</span>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 flex-grow flex flex-col">
            <p className="text-sm text-slate-600 line-clamp-3 flex-grow">
              {learning.description}
            </p>

            {/* Indicador de Confiança */}
            {learning.confidence_score && (
              <ConfidenceIndicator 
                score={learning.confidence_score}
                context="aprendizado extraído"
                compact={true}
                onReviewRequired={handleConfidenceReview}
                className="mb-2"
              />
            )}

            <div className="flex flex-wrap gap-1">
              {learning.niche && (
                <Badge variant="outline" className="text-xs">{learning.niche}</Badge>
              )}
              {learning.format && (
                <Badge variant="outline" className="text-xs">{learning.format}</Badge>
              )}
              {learning.trigger && (
                <Badge variant="secondary" className="text-xs bg-[hsl(var(--ev-accent-purple))]/10 text-[hsl(var(--ev-accent-purple))]">{learning.trigger}</Badge>
              )}
              {learning.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>

            {metrics && (
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-800">Métricas de Resultado</span>
                </div>
                <p className="text-sm text-slate-700">{metrics}</p>
              </div>
            )}

            {expanded && learning.rationale && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Por Que Funcionou</span>
                </div>
                <p className="text-sm text-blue-900">{learning.rationale}</p>
              </div>
            )}

            {expanded && learning.fileUrl && (
              <Button size="sm" variant="outline" className="w-full text-xs" asChild>
                <a href={learning.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-3 h-3 mr-2"/>Ver Evidência Original
                </a>
              </Button>
            )}

            <div className="pt-4 border-t border-slate-200/60 !mt-auto">
              <div className="flex items-center justify-between mb-4">
                {/* Confidence moved to top */}
                <div className="flex items-center gap-1">
                  {learning.tags?.includes('applied_to_briefing') && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge className="bg-[hsl(var(--ev-accent-purple))]/10 text-[hsl(var(--ev-accent-purple))] text-xs">No Briefing</Badge>
                      </TooltipTrigger>
                      <TooltipContent>Este aprendizado atualizou o Briefing Mestre.</TooltipContent>
                    </Tooltip>
                  )}
                  {learning.tags?.includes('in_current_plan') && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge className="bg-blue-100 text-blue-700 text-xs">No Plano</Badge>
                      </TooltipTrigger>
                      <TooltipContent>Este aprendizado está no plano de execução atual.</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Ações de Revisão */}
              {showReviewActions && !learning.reviewed && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleValidateLearning}
                    disabled={loading}
                    className="text-xs bg-green-600 hover:bg-green-700"
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Validar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleArchiveLearning}
                    disabled={loading}
                    className="text-xs text-slate-600"
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    Arquivar
                  </Button>
                </div>
              )}

              {/* Ações de Aplicação */}
              {!showReviewActions && learning.reviewed && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleApplyToBriefing}
                    className="text-xs"
                  >
                    <FileInput className="w-3 h-3 mr-1" />
                    P/ Briefing
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleApplyToCycle}
                    className="text-xs bg-[hsl(var(--ev-accent-purple))] hover:bg-[hsl(var(--ev-accent-purple))]/90"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    P/ Ciclo
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {expanded ? 'Menos' : 'Mais'}
                </Button>

                {showGlobalActions ? (
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs bg-[hsl(var(--ev-accent-purple))] hover:bg-[hsl(var(--ev-accent-purple))]/90"
                    onClick={() => { toast.info('Funcionalidade será implementada em breve.'); }}
                  >
                    <GitBranchPlus className="w-3 h-3 mr-1" />
                    Adaptar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    className={`text-xs ${needsReview ? 'bg-red-600 hover:bg-red-700' : 'bg-[hsl(var(--ev-accent-purple))] hover:bg-[hsl(var(--ev-accent-purple))]/90'}`}
                    onClick={handlePromoteClick}
                  >
                    <Rocket className="w-3 h-3 mr-1" />
                    {needsReview ? 'Revisar' : 'Promover'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Modals */}
      {showApplicationModal && (
        <LearningApplicationModal
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          learning={learning}
          onSuccess={handleApplicationSuccess}
        />
      )}
      
      {showPromotionModal && (
        <LearningPromotionModal
          isOpen={showPromotionModal}
          onClose={() => setShowPromotionModal(false)}
          learning={learning}
          onSuccess={handlePromotionSuccess}
        />
      )}
    </TooltipProvider>
  );
}
