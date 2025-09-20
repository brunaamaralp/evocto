import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ArrowRight,
  Users,
  FileText
} from 'lucide-react';

const mockChanges = [
  { field: 'Escopo IN', before: '8 posts/mês', after: '10 posts/mês' },
  { field: 'SLA Entrega', before: '10 dias', after: '7 dias' },
  { field: 'Política de Aprovação', before: 'Manual', after: 'Auto com Guardrails' }
];

const mockAffectedContracts = [
  { id: '1', clientName: 'ACME Corp', serviceName: 'Social Media', hasOverrides: false },
  { id: '2', clientName: 'Tech Solutions', serviceName: 'Social Media', hasOverrides: true },
  { id: '3', clientName: 'Healthcare Inc', serviceName: 'Social Media', hasOverrides: false }
];

export default function PropagationModal({ open, onClose, onConfirm, serviceName }) {
  const [selectedContracts, setSelectedContracts] = useState([]);
  const [step, setStep] = useState('review'); // 'review' | 'confirm' | 'progress'
  const [propagating, setPropagating] = useState(false);

  const handleSelectContract = (contractId, checked) => {
    if (checked) {
      setSelectedContracts(prev => [...prev, contractId]);
    } else {
      setSelectedContracts(prev => prev.filter(id => id !== contractId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedContracts(mockAffectedContracts.map(c => c.id));
    } else {
      setSelectedContracts([]);
    }
  };

  const handlePropagateChanges = async () => {
    if (selectedContracts.length === 0) return;
    
    if (step === 'review') {
      setStep('confirm');
      return;
    }
    
    setPropagating(true);
    setStep('progress');
    
    // Simular propagação
    await new Promise(res => setTimeout(res, 2000));
    
    onConfirm(selectedContracts);
    setPropagating(false);
    onClose();
    setStep('review');
    setSelectedContracts([]);
  };

  const resetModal = () => {
    setStep('review');
    setSelectedContracts([]);
    onClose();
  };

  if (step === 'progress') {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Propagando Mudanças</DialogTitle>
            <DialogDescription>
              Aplicando as alterações aos contratos selecionados...
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-slate-600">
              Propagando para {selectedContracts.length} contratos...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={resetModal}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Propagar Mudanças do Template
          </DialogTitle>
          <DialogDescription>
            {step === 'review' 
              ? `Revisar as mudanças que serão aplicadas aos contratos de "${serviceName}"`
              : 'Confirmar a propagação das mudanças'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'review' && (
            <>
              {/* Changes Summary */}
              <div className="space-y-3">
                <h3 className="font-medium text-slate-900">Mudanças no Template</h3>
                {mockChanges.map((change, index) => (
                  <Card key={index} className="border border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{change.field}</span>
                        <div className="flex items-center gap-3 text-sm">
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            {change.before}
                          </Badge>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {change.after}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Affected Contracts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900">Contratos Afetados</h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedContracts.length === mockAffectedContracts.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-slate-600">Selecionar todos</span>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {mockAffectedContracts.map(contract => (
                    <Card key={contract.id} className="border border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedContracts.includes(contract.id)}
                              onCheckedChange={(checked) => handleSelectContract(contract.id, checked)}
                            />
                            <div>
                              <p className="font-medium text-sm">{contract.clientName}</p>
                              <p className="text-xs text-slate-500">{contract.serviceName}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {contract.hasOverrides ? (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Com customizações
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Padrão
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {selectedContracts.length > 0 && (
                  <p className="text-sm text-slate-600">
                    {selectedContracts.length} de {mockAffectedContracts.length} contratos selecionados
                  </p>
                )}
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Atenção:</strong> Contratos com customizações manterão suas alterações específicas. 
                  Apenas os campos modificados no template serão atualizados.
                </AlertDescription>
              </Alert>
            </>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Confirmação final:</strong> Esta ação não pode ser desfeita. As mudanças serão aplicadas 
                  imediatamente a {selectedContracts.length} contratos.
                </AlertDescription>
              </Alert>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Resumo da Propagação:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• {mockChanges.length} mudanças serão aplicadas</li>
                  <li>• {selectedContracts.length} contratos serão atualizados</li>
                  <li>• Registro detalhado será criado no Audit Log</li>
                  <li>• Clientes serão notificados das mudanças</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={resetModal}>
            Cancelar
          </Button>
          
          {step === 'review' && (
            <Button
              onClick={handlePropagateChanges}
              disabled={selectedContracts.length === 0}
            >
              Revisar e Confirmar ({selectedContracts.length})
            </Button>
          )}
          
          {step === 'confirm' && (
            <Button
              onClick={handlePropagateChanges}
              disabled={propagating}
              className="bg-red-600 hover:bg-red-700"
            >
              {propagating ? 'Propagando...' : 'Confirmar Propagação'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}