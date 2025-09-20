import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Rocket, 
  Globe, 
  Users, 
  Star, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  Target,
  Sparkles
} from 'lucide-react';
import { useLearningManagement } from '@/hooks/useLearningManagement';
import { toast } from 'sonner';

/**
 * Modal para promover aprendizados para o playbook da agência
 */
export default function LearningPromotionModal({ 
  isOpen, 
  onClose, 
  learning, 
  onSuccess 
}) {
  const {
    promoteToPlaybook,
    loading,
    error
  } = useLearningManagement();

  const [promotionData, setPromotionData] = useState({
    reason: '',
    impact: '',
    applicability: '',
    notes: ''
  });

  const handlePromote = async () => {
    if (!promotionData.reason.trim()) {
      toast.error('Explique por que este aprendizado deve ser promovido');
      return;
    }

    try {
      await promoteToPlaybook(learning.id, promotionData);
      toast.success('Aprendizado promovido para playbook da agência!');
      onSuccess();
      onClose();
    } catch (err) {
      // Erro já tratado no hook
    }
  };

  const handleCancel = () => {
    setPromotionData({
      reason: '',
      impact: '',
      applicability: '',
      notes: ''
    });
    onClose();
  };

  const getConfidenceLevel = (score) => {
    if (score >= 80) return { level: 'Alta', color: 'green', icon: CheckCircle };
    if (score >= 60) return { level: 'Média', color: 'yellow', icon: AlertTriangle };
    return { level: 'Baixa', color: 'red', icon: AlertTriangle };
  };

  const confidence = getConfidenceLevel(learning?.confidence_score || 0);
  const ConfidenceIcon = confidence.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-purple-600" />
            Promover para Playbook da Agência
          </DialogTitle>
          <DialogDescription>
            Transforme este aprendizado em uma prática padrão da agência, compartilhando com toda a equipe.
          </DialogDescription>
        </DialogHeader>

        {learning && (
          <div className="space-y-6">
            {/* Preview do Aprendizado */}
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg text-purple-900">{learning.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <ConfidenceIcon className={`w-4 h-4 text-${confidence.color}-600`} />
                    <Badge variant="outline" className={`text-xs border-${confidence.color}-200 text-${confidence.color}-700`}>
                      Confiança: {confidence.level}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-purple-800">{learning.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {learning.niche && (
                    <Badge variant="outline" className="text-xs">{learning.niche}</Badge>
                  )}
                  {learning.format && (
                    <Badge variant="outline" className="text-xs">{learning.format}</Badge>
                  )}
                  {learning.trigger && (
                    <Badge variant="secondary" className="text-xs">{learning.trigger}</Badge>
                  )}
                </div>

                {learning.rationale && (
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Por que Funcionou</span>
                    </div>
                    <p className="text-sm text-purple-700">{learning.rationale}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Benefícios da Promoção */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Benefícios da Promoção
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Acesso Global</h4>
                      <p className="text-sm text-green-700">Disponível para toda a equipe da agência</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Colaboração</h4>
                      <p className="text-sm text-green-700">Outros consultores podem aplicar e melhorar</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Padronização</h4>
                      <p className="text-sm text-green-700">Torna-se uma prática padrão da agência</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Inovação</h4>
                      <p className="text-sm text-green-700">Impulsiona a evolução das estratégias</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Formulário de Promoção */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Por que promover este aprendizado? *</Label>
                <Textarea
                  id="reason"
                  value={promotionData.reason}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Explique por que este aprendizado deve ser compartilhado com toda a agência..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="impact">Qual o impacto esperado?</Label>
                <Textarea
                  id="impact"
                  value={promotionData.impact}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, impact: e.target.value }))}
                  placeholder="Descreva o impacto que este aprendizado pode ter quando aplicado por outros consultores..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicability">Em que contextos se aplica?</Label>
                <Textarea
                  id="applicability"
                  value={promotionData.applicability}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, applicability: e.target.value }))}
                  placeholder="Descreva em que tipos de clientes, nichos ou situações este aprendizado é mais relevante..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas adicionais</Label>
                <Textarea
                  id="notes"
                  value={promotionData.notes}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Adicione qualquer observação adicional sobre este aprendizado..."
                  rows={2}
                />
              </div>
            </div>

            {/* Confirmação */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Confirmação</span>
                </div>
                <p className="text-sm text-blue-700">
                  Ao promover este aprendizado, ele será marcado como compartilhado e ficará disponível 
                  para toda a equipe da agência como uma prática padrão.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handlePromote}
            disabled={loading || !promotionData.reason.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Rocket className="w-4 h-4 mr-2" />
            {loading ? 'Promovendo...' : 'Promover para Playbook'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

