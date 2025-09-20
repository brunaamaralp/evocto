import React, { useState, useEffect } from 'react';
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  FileInput, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Lightbulb,
  Target,
  Users,
  Briefcase,
  CheckSquare,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useLearningManagement } from '@/hooks/useLearningManagement';
import { useSession } from '@/components/auth/SessionManager';
import { Brief, CyclePlan, Service } from '@/api/entities';
import { toast } from 'sonner';

/**
 * Modal para aplicar aprendizados a briefings e ciclos
 */
export default function LearningApplicationModal({ 
  isOpen, 
  onClose, 
  learning, 
  onSuccess 
}) {
  const { agency } = useSession();
  const {
    applyLearningToBriefing,
    applyLearningToCycle,
    loading,
    error
  } = useLearningManagement();

  const [applicationType, setApplicationType] = useState('briefing');
  const [targetId, setTargetId] = useState('');
  const [applicationNotes, setApplicationNotes] = useState('');
  const [availableBriefs, setAvailableBriefs] = useState([]);
  const [availableCycles, setAvailableCycles] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen && learning) {
      loadTargetData();
    }
  }, [isOpen, learning, applicationType]);

  const loadTargetData = async () => {
    setLoadingData(true);
    try {
      if (applicationType === 'briefing') {
        const briefs = await Brief.filter({ agencyId: agency.id });
        setAvailableBriefs(briefs || []);
      } else {
        const cycles = await CyclePlan.filter({ agencyId: agency.id });
        setAvailableCycles(cycles || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      toast.error('Erro ao carregar dados para aplicação');
    } finally {
      setLoadingData(false);
    }
  };

  const handleApply = async () => {
    if (!targetId) {
      toast.error('Selecione um alvo para aplicação');
      return;
    }

    try {
      if (applicationType === 'briefing') {
        await applyLearningToBriefing(learning.id, targetId);
      } else {
        await applyLearningToCycle(learning.id, targetId);
      }

      toast.success(`Aprendizado aplicado ao ${applicationType === 'briefing' ? 'briefing' : 'ciclo'} com sucesso!`);
      onSuccess();
      onClose();
    } catch (err) {
      // Erro já tratado no hook
    }
  };

  const handleCancel = () => {
    setApplicationType('briefing');
    setTargetId('');
    setApplicationNotes('');
    onClose();
  };

  const getTargetName = (id) => {
    if (applicationType === 'briefing') {
      const brief = availableBriefs.find(b => b.id === id);
      return brief ? brief.title : '';
    } else {
      const cycle = availableCycles.find(c => c.id === id);
      return cycle ? cycle.name : '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-purple-600" />
            Aplicar Aprendizado
          </DialogTitle>
          <DialogDescription>
            Aplique este aprendizado a um briefing ou ciclo de execução para influenciar estratégias futuras.
          </DialogDescription>
        </DialogHeader>

        {learning && (
          <div className="space-y-6">
            {/* Preview do Aprendizado */}
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-purple-900">{learning.title}</CardTitle>
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

            {/* Tipo de Aplicação */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Tipo de Aplicação</Label>
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${
                    applicationType === 'briefing' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setApplicationType('briefing')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileInput className="w-5 h-5 text-purple-600" />
                      <div>
                        <h3 className="font-medium">Briefing</h3>
                        <p className="text-sm text-slate-600">Influenciar estratégias futuras</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    applicationType === 'cycle' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setApplicationType('cycle')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-purple-600" />
                      <div>
                        <h3 className="font-medium">Ciclo de Execução</h3>
                        <p className="text-sm text-slate-600">Aplicar em execução atual</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Seleção do Alvo */}
            <div className="space-y-2">
              <Label htmlFor="targetId">
                {applicationType === 'briefing' ? 'Briefing' : 'Ciclo'} de Destino
              </Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione um ${applicationType === 'briefing' ? 'briefing' : 'ciclo'}`} />
                </SelectTrigger>
                <SelectContent>
                  {applicationType === 'briefing' ? (
                    availableBriefs.map(brief => (
                      <SelectItem key={brief.id} value={brief.id}>
                        <div className="flex items-center gap-2">
                          <FileInput className="w-4 h-4" />
                          {brief.title}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    availableCycles.map(cycle => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          {cycle.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Notas de Aplicação */}
            <div className="space-y-2">
              <Label htmlFor="applicationNotes">Notas de Aplicação (Opcional)</Label>
              <Textarea
                id="applicationNotes"
                value={applicationNotes}
                onChange={(e) => setApplicationNotes(e.target.value)}
                placeholder="Adicione observações sobre como este aprendizado deve ser aplicado..."
                rows={3}
              />
            </div>

            {/* Preview da Aplicação */}
            {targetId && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Preview da Aplicação</span>
                  </div>
                  <p className="text-sm text-green-700">
                    O aprendizado <strong>"{learning.title}"</strong> será aplicado ao{' '}
                    <strong>"{getTargetName(targetId)}"</strong>
                  </p>
                  {applicationNotes && (
                    <p className="text-sm text-green-600 mt-2">
                      <strong>Notas:</strong> {applicationNotes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleApply}
            disabled={loading || loadingData || !targetId}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? 'Aplicando...' : 'Aplicar Aprendizado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

