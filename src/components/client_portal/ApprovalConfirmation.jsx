import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CheckCircle, XCircle, AlertTriangle,
  MessageCircle, Clock, ArrowRight, ArrowLeft,
  Loader2, Shield, FileText, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ApprovalConfirmation({
  isOpen,
  onClose,
  approval,
  action, // 'approve' | 'reject'
  onConfirm,
  loading = false
}) {
  const [comment, setComment] = useState('');
  const [currentStep, setCurrentStep] = useState('confirm'); // 'confirm' | 'comment' | 'final'

  const isApproval = action === 'approve';
  const isRejection = action === 'reject';

  const handleNext = () => {
    if (currentStep === 'confirm') {
      setCurrentStep(isRejection ? 'comment' : 'final');
    } else if (currentStep === 'comment') {
      setCurrentStep('final');
    }
  };

  const handleBack = () => {
    if (currentStep === 'final') {
      setCurrentStep(isRejection ? 'comment' : 'confirm');
    } else if (currentStep === 'comment') {
      setCurrentStep('confirm');
    }
  };

  const handleConfirmAction = () => {
    onConfirm(comment.trim());
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 'confirm':
        return (
          <ConfirmationStep 
            approval={approval} 
            action={action}
            onNext={handleNext}
            onCancel={onClose}
          />
        );
      
      case 'comment':
        return (
          <CommentStep
            action={action}
            comment={comment}
            onCommentChange={setComment}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      
      case 'final':
        return (
          <FinalConfirmationStep
            approval={approval}
            action={action}
            comment={comment}
            onConfirm={handleConfirmAction}
            onBack={handleBack}
            loading={loading}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {isApproval ? (
              <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 mr-3 text-red-600" />
            )}
            {isApproval ? 'Confirmar Aprovação' : 'Solicitar Alterações'}
          </DialogTitle>
        </DialogHeader>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {getStepContent()}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Confirmação inicial
function ConfirmationStep({ approval, action, onNext, onCancel }) {
  const isApproval = action === 'approve';

  return (
    <div className="space-y-6">
      {/* Document Summary */}
      <Card className={`border-2 ${isApproval ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${isApproval ? 'bg-green-100' : 'bg-red-100'}`}>
              <FileText className={`w-6 h-6 ${isApproval ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {approval.title}
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Prazo: {format(new Date(approval.expiresAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </div>
                
                <div className="flex items-center">
                  <Badge variant="outline" className="text-xs">
                    {approval.contentType.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Confirmation */}
      <Alert className={isApproval ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <Shield className={`h-4 w-4 ${isApproval ? 'text-green-600' : 'text-red-600'}`} />
        <AlertDescription className="text-base">
          {isApproval ? (
            <>
              <strong>Você está prestes a APROVAR este documento.</strong><br />
              Esta ação dará luz verde para a agência prosseguir com a execução.
            </>
          ) : (
            <>
              <strong>Você está solicitando alterações neste documento.</strong><br />
              Sua equipe será notificada e poderá fazer os ajustes necessários.
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button 
          onClick={onNext} 
          className={`flex-1 ${isApproval ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {isApproval ? 'Prosseguir com Aprovação' : 'Adicionar Comentários'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 2: Comentários (principalmente para rejeições)
function CommentStep({ action, comment, onCommentChange, onNext, onBack }) {
  const isRejection = action === 'reject';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
            {isRejection ? 'Especifique as Alterações Necessárias' : 'Comentários Adicionais (Opcional)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label htmlFor="comment" className="text-base">
              {isRejection ? 
                'Descreva o que precisa ser alterado:' : 
                'Algum comentário sobre sua aprovação:'
              }
            </Label>
            
            <Textarea
              id="comment"
              placeholder={isRejection ? 
                'Ex: Por favor, alterar as cores para tons mais vibrantes e revisar o call-to-action...' : 
                'Ex: Ótimo trabalho! Apenas uma observação sobre...'
              }
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              rows={5}
              className="resize-none"
            />
            
            {isRejection && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Dica:</strong> Seja específico sobre o que precisa ser alterado. 
                  Isso ajuda sua equipe a fazer os ajustes corretos na primeira tentativa.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onBack} className="flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        
        <Button 
          onClick={onNext} 
          disabled={isRejection && comment.trim().length < 10}
          className="flex-1"
        >
          Prosseguir
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      
      {isRejection && comment.trim().length < 10 && (
        <p className="text-sm text-red-600 text-center">
          Por favor, forneça mais detalhes sobre as alterações necessárias (mínimo 10 caracteres)
        </p>
      )}
    </div>
  );
}

// Step 3: Confirmação final
function FinalConfirmationStep({ approval, action, comment, onConfirm, onBack, loading }) {
  const isApproval = action === 'approve';

  return (
    <div className="space-y-6">
      {/* Final Review */}
      <Card className={`border-2 ${isApproval ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            {isApproval ? (
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            ) : (
              <XCircle className="w-16 h-16 text-red-600 mx-auto" />
            )}
            
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {isApproval ? 'Pronto para Aprovar!' : 'Pronto para Solicitar Alterações!'}
              </h3>
              <p className="text-gray-600 mt-2">
                {isApproval ? 
                  'Sua aprovação será registrada e a equipe será notificada para prosseguir.' :
                  'Sua solicitação será enviada e a equipe fará os ajustes necessários.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comment Preview */}
      {comment && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium text-gray-700">Seus comentários:</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-900 italic">"{comment}"</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Actions */}
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onBack} disabled={loading} className="flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        
        <Button 
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 ${isApproval ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              {isApproval ? 'CONFIRMAR APROVAÇÃO' : 'ENVIAR SOLICITAÇÃO'}
              <CheckCircle className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Security Note */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Sua decisão será registrada com timestamp e ficará disponível no histórico do projeto.
        </AlertDescription>
      </Alert>
    </div>
  );
}