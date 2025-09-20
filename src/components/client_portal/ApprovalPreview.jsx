
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, Download, Eye, MessageCircle, 
  CheckCircle, XCircle, Clock, AlertTriangle,
  ExternalLink, User, Calendar, Loader2, X,
  ChevronLeft, ChevronRight, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { processClientApproval } from '@/api/functions';

export default function ApprovalPreview({ 
  approval, 
  onClose, 
  onApprovalSubmitted 
}) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState('preview'); // 'preview' | 'action' | 'confirming'
  const [selectedAction, setSelectedAction] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadApprovalContent = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar conteúdo baseado no tipo
      let contentData = null;
      
      switch (approval.contentType) {
        case 'briefing':
          const { BriefingVersion } = await import('@/api/entities');
          contentData = await BriefingVersion.get(approval.contentId);
          break;
          
        case 'cycle_plan':
          const { CyclePlan } = await import('@/api/entities');
          contentData = await CyclePlan.get(approval.contentId);
          break;
          
        default:
          contentData = { 
            title: approval.title,
            description: approval.description || 'Conteúdo não disponível para preview'
          };
      }
      
      setContent(contentData);
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
      toast.error('Erro ao carregar conteúdo para aprovação');
      setContent({ 
        error: 'Não foi possível carregar o conteúdo',
        title: approval.title 
      });
    } finally {
      setLoading(false);
    }
  }, [approval.contentType, approval.contentId, approval.title, approval.description]);

  useEffect(() => {
    loadApprovalContent();
  }, [loadApprovalContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (currentStep === 'confirming') {
          setCurrentStep('action');
        } else if (currentStep === 'action') {
          setCurrentStep('preview');
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, onClose]);

  const handleNext = () => {
    if (currentStep === 'preview') {
      setCurrentStep('action');
    } else if (currentStep === 'action' && selectedAction) {
      setCurrentStep('confirming');
    }
  };

  const handleBack = () => {
    if (currentStep === 'confirming') {
      setCurrentStep('action');
    } else if (currentStep === 'action') {
      setCurrentStep('preview');
    }
  };

  const handleActionSelect = (action) => {
    setSelectedAction(action);
  };

  const confirmApproval = async () => {
    try {
      setSubmitting(true);
      
      const response = await processClientApproval({
        approvalId: approval.id,
        action: selectedAction,
        comment: comment.trim()
      });

      if (response.data.success) {
        toast.success(
          selectedAction === 'approve' 
            ? '✅ Documento aprovado com sucesso!' 
            : '📝 Feedback enviado com sucesso!'
        );
        
        onApprovalSubmitted?.(approval.id, selectedAction);
        onClose();
      } else {
        throw new Error(response.data.error || 'Erro ao processar aprovação');
      }
    } catch (error) {
      console.error('Erro ao processar aprovação:', error);
      toast.error(error.message || 'Erro ao processar aprovação');
    } finally {
      setSubmitting(false);
    }
  };

  const getContentPreview = () => {
    if (!content || content.error) {
      return (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {content?.error || 'Conteúdo não disponível para preview'}
          </AlertDescription>
        </Alert>
      );
    }

    switch (approval.contentType) {
      case 'briefing':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Objetivos
                </h4>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {content.snapshot_data?.objectives || 'Não especificado'}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  Público-alvo
                </h4>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {content.snapshot_data?.target_audience || 'Não especificado'}
                  </p>
                </div>
              </div>
            </div>
            
            {content.snapshot_data?.insights && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Insights Principais
                </h4>
                <div className="space-y-3">
                  {content.snapshot_data.insights.persona && (
                    <div className="flex items-start space-x-3">
                      <Badge className="bg-green-100 text-green-800 border-green-300">Persona</Badge>
                      <p className="text-sm text-gray-700 flex-1">{content.snapshot_data.insights.persona}</p>
                    </div>
                  )}
                  {content.snapshot_data.insights.dores && (
                    <div className="flex items-start space-x-3">
                      <Badge className="bg-red-100 text-red-800 border-red-300">Dores</Badge>
                      <p className="text-sm text-gray-700 flex-1">{content.snapshot_data.insights.dores.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'cycle_plan':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                Mudança-chave do Ciclo
              </h4>
              <p className="text-gray-700 leading-relaxed">
                {content.planData?.mudancaChave || 'Não especificado'}
              </p>
            </div>
            
            {content.planData?.prioridades && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  Prioridades do Ciclo
                </h4>
                <div className="space-y-3">
                  {content.planData.prioridades.map((prioridade, index) => (
                    <div key={index} className="flex items-start space-x-4 bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700 leading-relaxed">
                          {typeof prioridade === 'string' ? prioridade : prioridade.tarefa}
                        </p>
                        {typeof prioridade === 'object' && prioridade.prazo && (
                          <p className="text-xs text-gray-500 mt-1">Prazo: {prioridade.prazo}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Preview não disponível</h3>
            <p className="text-gray-600 mb-4">Use o botão "Baixar PDF" para visualizar o documento completo</p>
            {approval.pdfUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(approval.pdfUrl, '_blank')}
                className="inline-flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
            )}
          </div>
        );
    }
  };

  const getUrgencyLevel = () => {
    if (!approval.expiresAt) return 'normal';
    
    const now = new Date();
    const expires = new Date(approval.expiresAt);
    const hoursUntilExpiry = (expires - now) / (1000 * 60 * 60);
    
    if (hoursUntilExpiry <= 4) return 'critical';
    if (hoursUntilExpiry <= 24) return 'high';
    if (hoursUntilExpiry <= 72) return 'medium';
    return 'normal';
  };

  const urgencyLevel = getUrgencyLevel();
  const urgencyConfig = {
    critical: { 
      color: 'bg-red-100 border-red-300 text-red-800',
      icon: '🚨',
      label: 'Crítico - Expira em breve!'
    },
    high: { 
      color: 'bg-orange-100 border-orange-300 text-orange-800',
      icon: '⚠️',
      label: 'Alta prioridade'
    },
    medium: { 
      color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      icon: '⏰',
      label: 'Prioridade média'
    },
    normal: { 
      color: 'bg-blue-100 border-blue-300 text-blue-800',
      icon: '📋',
      label: 'Prioridade normal'
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-white rounded-xl shadow-2xl w-full flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'max-w-7xl h-[95vh]' : 'max-w-4xl max-h-[85vh]'
        }`}
      >
        {/* Fixed Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                {/* Step indicators */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full transition-colors ${
                    currentStep === 'preview' ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                  <div className={`w-2 h-2 rounded-full transition-colors ${
                    currentStep === 'action' ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                  <div className={`w-2 h-2 rounded-full transition-colors ${
                    currentStep === 'confirming' ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                </div>

                <Badge className={urgencyConfig[urgencyLevel].color} variant="outline">
                  {urgencyConfig[urgencyLevel].icon} {urgencyConfig[urgencyLevel].label}
                </Badge>

                <Badge variant="secondary">
                  {approval.contentType === 'briefing' && '📋 Briefing'}
                  {approval.contentType === 'cycle_plan' && '📅 Plano de Ciclo'}
                  {approval.contentType === 'creative' && '🎨 Criativo'}
                  {approval.contentType === 'proposal' && '📄 Proposta'}
                  {approval.contentType === 'report' && '📊 Relatório'}
                </Badge>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {approval.title}
              </h2>
              
              {approval.description && (
                <p className="text-gray-600 mb-3 leading-relaxed">
                  {approval.description}
                </p>
              )}

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Enviado por {approval.approverName || 'Agência'}</span>
                </div>
                {approval.expiresAt && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      Expira em {format(new Date(approval.expiresAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-gray-400 hover:text-gray-600"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 1: Preview */}
            {currentStep === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 overflow-y-auto p-6">
                  {loading ? (
                    <div className="space-y-6">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-6 bg-gray-200 rounded w-1/4 mb-3"></div>
                          <div className="h-24 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {getContentPreview()}
                      
                      {approval.customMessage && (
                        <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                            <MessageCircle className="w-5 h-5 mr-2" />
                            Mensagem da Agência
                          </h4>
                          <p className="text-blue-800 leading-relaxed">
                            {approval.customMessage}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Fixed bottom actions for Step 1 */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-3">
                      {approval.pdfUrl && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(approval.pdfUrl, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar PDF
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button variant="outline" onClick={onClose}>
                        Fechar
                      </Button>
                      <Button 
                        onClick={handleNext}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        Continuar
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Action Selection */}
            {currentStep === 'action' && (
              <motion.div
                key="action"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col p-6"
              >
                <div className="flex-1">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      O que você gostaria de fazer?
                    </h3>
                    <p className="text-gray-600">
                      Escolha uma ação para este documento
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {/* Approve Option */}
                    <button
                      onClick={() => handleActionSelect('approve')}
                      className={`p-6 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-lg ${
                        selectedAction === 'approve'
                          ? 'border-green-500 bg-green-50 shadow-lg transform scale-105'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-bold text-gray-900">Aprovar</h4>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4">
                        O documento está perfeito e pode ser executado conforme apresentado.
                      </p>
                      <div className="flex items-center text-sm text-green-600">
                        <span>✓ Continue com o planejamento</span>
                      </div>
                    </button>

                    {/* Request Changes Option */}
                    <button
                      onClick={() => handleActionSelect('reject')}
                      className={`p-6 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-lg ${
                        selectedAction === 'reject'
                          ? 'border-orange-500 bg-orange-50 shadow-lg transform scale-105'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-bold text-gray-900">Solicitar Alterações</h4>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4">
                        O documento precisa de ajustes antes de ser executado.
                      </p>
                      <div className="flex items-center text-sm text-orange-600">
                        <span>→ Envie feedback para a agência</span>
                      </div>
                    </button>
                  </div>

                  {selectedAction && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 max-w-2xl mx-auto"
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        {selectedAction === 'approve' ? 'Comentários (opcional)' : 'Quais alterações você gostaria?'}
                      </label>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={
                          selectedAction === 'approve' 
                            ? "Adicione comentários sobre sua aprovação..." 
                            : "Descreva as alterações que você gostaria de ver..."
                        }
                        className="resize-none h-24"
                        rows={4}
                      />
                    </motion.div>
                  )}
                </div>
                
                {/* Fixed bottom actions for Step 2 */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  
                  <Button 
                    onClick={handleNext}
                    disabled={!selectedAction}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedAction === 'approve' ? 'Confirmar Aprovação' : 'Enviar Feedback'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 'confirming' && (
              <motion.div
                key="confirming"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="h-full flex flex-col p-6"
              >
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-lg">
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                      selectedAction === 'approve' 
                        ? 'bg-green-100' 
                        : 'bg-orange-100'
                    }`}>
                      {selectedAction === 'approve' ? (
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      ) : (
                        <MessageCircle className="w-10 h-10 text-orange-600" />
                      )}
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      {selectedAction === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Solicitação de Alterações'}
                    </h3>
                    
                    <div className="space-y-4 text-left">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Documento:</h4>
                        <p className="text-gray-700">{approval.title}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Sua decisão:</h4>
                        <div className="flex items-center space-x-2">
                          {selectedAction === 'approve' ? (
                            <>
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-green-700 font-medium">Aprovar documento</span>
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-5 h-5 text-orange-600" />
                              <span className="text-orange-700 font-medium">Solicitar alterações</span>
                            </>
                          )}
                        </div>
                      </div>

                      {comment && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2">Seus comentários:</h4>
                          <p className="text-blue-800 italic">"{comment}"</p>
                        </div>
                      )}
                    </div>

                    {selectedAction === 'approve' && (
                      <Alert className="mt-6 border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Esta ação não pode ser desfeita.</strong> Ao aprovar, você está confirmando que concorda com o documento e autoriza sua execução.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
                
                {/* Fixed bottom actions for Step 3 */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <Button variant="outline" onClick={handleBack} disabled={submitting}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  
                  <Button 
                    onClick={confirmApproval}
                    disabled={submitting}
                    className={`${
                      selectedAction === 'approve' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-orange-600 hover:bg-orange-700'
                    } text-white min-w-[200px]`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        {selectedAction === 'approve' ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirmar Aprovação
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Enviar Feedback
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
