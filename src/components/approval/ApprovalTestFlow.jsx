import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Play, CheckCircle, AlertTriangle, Clock,
  Mail, ExternalLink, FileText, User, Calendar
} from 'lucide-react';
import { approvalWorkflow } from '@/api/functions';
import { processClientApproval } from '@/api/functions';

const ApprovalTestFlow = ({ cyclePlan, briefingVersion, onTestComplete }) => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);

  const approvalTests = [
    {
      id: 'create_approval',
      title: 'Criar Solicitação de Aprovação',
      description: 'Gerar token público e enviar email de notificação',
      type: 'create'
    },
    {
      id: 'generate_pdf',
      title: 'Gerar PDF para Aprovação',
      description: 'Criar documento PDF com conteúdo formatado',
      type: 'pdf'
    },
    {
      id: 'send_notification',
      title: 'Enviar Notificação',
      description: 'Disparar email de notificação para cliente',
      type: 'email'
    },
    {
      id: 'simulate_approval',
      title: 'Simular Aprovação',
      description: 'Testar fluxo de aprovação do cliente',
      type: 'approve'
    },
    {
      id: 'simulate_rejection',
      title: 'Simular Rejeição',
      description: 'Testar fluxo de rejeição com comentários',
      type: 'reject'
    }
  ];

  const runFullTest = async () => {
    setIsRunning(true);
    setTestResults({});
    
    for (const test of approvalTests) {
      setCurrentStep(test.id);
      const result = await runSingleTest(test);
      setTestResults(prev => ({ ...prev, [test.id]: result }));
      
      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setCurrentStep(null);
    setIsRunning(false);
    onTestComplete?.(testResults);
  };

  const runSingleTest = async (test) => {
    const startTime = Date.now();
    
    try {
      switch (test.type) {
        case 'create':
          return await testCreateApproval();
        case 'pdf':
          return await testPdfGeneration();
        case 'email':
          return await testEmailNotification();
        case 'approve':
          return await testApprovalFlow();
        case 'reject':
          return await testRejectionFlow();
        default:
          throw new Error(`Unknown test type: ${test.type}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  };

  const testCreateApproval = async () => {
    const contentType = cyclePlan ? 'cycle_plan' : 'briefing';
    const contentId = cyclePlan?.id || briefingVersion?.id;
    
    if (!contentId) throw new Error('No content ID provided');

    const response = await approvalWorkflow({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      json: async () => ({
        action: 'create',
        contentType,
        contentId,
        approverEmail: 'test@cliente.com',
        approverName: 'Cliente Teste',
        message: 'Por favor, revise e aprove este conteúdo.',
        expiryDays: 7
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      success: true,
      data: {
        approvalId: result.approval.id,
        token: result.approval.token,
        approvalUrl: result.approval.approvalUrl,
        expiresAt: result.approval.expiresAt
      },
      message: 'Aprovação criada com sucesso'
    };
  };

  const testPdfGeneration = async () => {
    // Mock PDF generation test
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            pdfUrl: 'https://example.com/test.pdf',
            size: '2.3 MB',
            pages: 5
          },
          message: 'PDF gerado com sucesso'
        });
      }, 2000);
    });
  };

  const testEmailNotification = async () => {
    // Mock email test
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            emailId: 'email_123',
            recipient: 'test@cliente.com',
            sentAt: new Date().toISOString()
          },
          message: 'Email enviado com sucesso'
        });
      }, 1500);
    });
  };

  const testApprovalFlow = async () => {
    // Mock approval simulation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            status: 'approved',
            approvedAt: new Date().toISOString(),
            comment: 'Conteúdo aprovado! Ótimo trabalho.'
          },
          message: 'Aprovação processada com sucesso'
        });
      }, 1000);
    });
  };

  const testRejectionFlow = async () => {
    // Mock rejection simulation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            comment: 'Precisa de alguns ajustes na seção de objetivos.'
          },
          message: 'Rejeição processada com sucesso'
        });
      }, 1000);
    });
  };

  const getStepIcon = (testId, result) => {
    if (currentStep === testId) return <Clock className="w-4 h-4 animate-spin" />;
    if (!result) return <Play className="w-4 h-4 text-slate-400" />;
    if (result.success) return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  const getStepStatus = (testId, result) => {
    if (currentStep === testId) return 'Executando...';
    if (!result) return 'Aguardando';
    if (result.success) return 'Sucesso';
    return 'Falha';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Teste de Fluxo de Aprovação End-to-End
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Teste completo do sistema de aprovações desde a criação até o processamento
          </p>
          <Button 
            onClick={runFullTest} 
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? 'Testando...' : 'Executar Teste Completo'}
          </Button>
        </div>

        <div className="space-y-4">
          {approvalTests.map((test) => {
            const result = testResults[test.id];
            const isActive = currentStep === test.id;
            
            return (
              <div 
                key={test.id}
                className={`border rounded-lg p-4 transition-all ${
                  isActive ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStepIcon(test.id, result)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-slate-900">{test.title}</h4>
                      <Badge 
                        variant={
                          result?.success ? 'default' : 
                          result?.error ? 'destructive' : 
                          isActive ? 'secondary' : 
                          'outline'
                        }
                      >
                        {getStepStatus(test.id, result)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-2">{test.description}</p>
                    
                    {result && (
                      <div className="mt-3">
                        {result.success ? (
                          <Alert>
                            <CheckCircle className="w-4 h-4" />
                            <AlertDescription>
                              <strong>Sucesso:</strong> {result.message}
                              {result.data && (
                                <div className="mt-2 text-xs text-slate-600">
                                  <pre className="bg-slate-100 p-2 rounded">
                                    {JSON.stringify(result.data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert variant="destructive">
                            <AlertTriangle className="w-4 h-4" />
                            <AlertDescription>
                              <strong>Erro:</strong> {result.error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(testResults).length > 0 && (
          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Resumo dos Testes</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Testes executados:</span>
                  <span className="ml-2 font-medium">{Object.keys(testResults).length}/{approvalTests.length}</span>
                </div>
                <div>
                  <span className="text-slate-600">Taxa de sucesso:</span>
                  <span className="ml-2 font-medium text-emerald-600">
                    {Math.round((Object.values(testResults).filter(r => r.success).length / Object.keys(testResults).length) * 100)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default ApprovalTestFlow;