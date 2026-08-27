import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  Eye, 
  ArrowLeft,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SubmissionConfirmation({ 
  responses,
  questions,
  validationResults,
  onSubmit,
  onBack,
  submitting,
  agencyName,
  clientName
}) {
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const canSubmit = confirmTerms && confirmAccuracy && 
                   validationResults?.errors?.length === 0 &&
                   !submitting;

  const completedQuestions = questions.filter(q => {
    const response = responses[q.id];
    return response && response.toString().trim() !== '';
  });

  const responsesByCategory = questions.reduce((acc, question) => {
    const response = responses[question.id];
    if (!response || response.toString().trim() === '') return acc;

    const category = question.categoryName || 'Geral';
    if (!acc[category]) acc[category] = [];
    
    acc[category].push({
      question: question.text,
      answer: response,
      type: question.type
    });
    
    return acc;
  }, {});

  const formatAnswer = (answer, type) => {
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    if (type === 'currency') {
      return `R$ ${answer}`;
    }
    if (type === 'percentage') {
      return `${answer}%`;
    }
    return answer.toString();
  };

  return (
    <div className="space-y-6">
      {/* Resumo do preenchimento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resumo do Briefing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Progresso</span>
            <div className="flex items-center gap-2">
              <Progress value={validationResults?.progress?.percentage || 0} className="w-24" />
              <Badge variant="outline">
                {completedQuestions.length}/{questions.length} perguntas
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Cliente:</span>
              <div className="font-medium">{clientName}</div>
            </div>
            <div>
              <span className="text-gray-600">Agência:</span>
              <div className="font-medium">{agencyName}</div>
            </div>
          </div>

          {/* Status de validação */}
          <div className="space-y-2">
            {validationResults?.errors?.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validationResults.errors.length} erro(s) precisa(m) ser corrigido(s) antes do envio.
                </AlertDescription>
              </Alert>
            )}
            
            {validationResults?.warnings?.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validationResults.warnings.length} aviso(s) - você pode enviar, mas considere revisar.
                </AlertDescription>
              </Alert>
            )}

            {validationResults?.errors?.length === 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Briefing pronto para envio! Todas as validações passaram.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Preview das respostas */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                Visualizar Respostas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Prévia das Suas Respostas</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {Object.entries(responsesByCategory).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-lg mb-3 pb-2 border-b">
                      {category}
                    </h3>
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-sm text-gray-700 mb-1">
                            {item.question}
                          </div>
                          <div className="text-gray-900">
                            {formatAnswer(item.answer, item.type)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Confirmações necessárias */}
      <Card>
        <CardHeader>
          <CardTitle>Confirmações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="confirm-accuracy"
              checked={confirmAccuracy}
              onCheckedChange={setConfirmAccuracy}
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="confirm-accuracy"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Confirmo que as informações fornecidas são verdadeiras e precisas
              </label>
              <p className="text-xs text-gray-600">
                As informações serão usadas para análise e recomendações personalizadas.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="confirm-terms"
              checked={confirmTerms}
              onCheckedChange={setConfirmTerms}
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="confirm-terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Concordo com o processamento dos dados fornecidos
              </label>
              <p className="text-xs text-gray-600">
                Seus dados serão tratados com confidencialidade conforme nossa política de privacidade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tempo estimado */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <strong>Próximo passo:</strong> Após o envio, nossa equipe analisará suas respostas 
          e entrará em contato em até 2 dias úteis com insights personalizados.
        </AlertDescription>
      </Alert>

      {/* Botões de ação */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={submitting}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar e Revisar
        </Button>

        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar Briefing
            </>
          )}
        </Button>
      </div>
    </div>
  );
}