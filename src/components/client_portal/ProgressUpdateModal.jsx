import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar,
  TrendingUp,
  Save,
  X,
  Target,
  BarChart3
} from 'lucide-react';

/**
 * Modal para atualizar progresso de KPIs
 */
export default function ProgressUpdateModal({ 
  isOpen, 
  onClose, 
  kpi = null, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    currentValue: kpi?.current || '',
    previousValue: kpi?.previous || '',
    target: kpi?.target || '',
    progress: kpi?.progress || '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    status: 'on_track'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateProgress = () => {
    const current = parseFloat(formData.currentValue) || 0;
    const target = parseFloat(formData.target) || 1;
    return Math.round((current / target) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Atualizar Progresso do KPI
          </DialogTitle>
          <DialogDescription>
            Registre o progresso atual do indicador: {kpi?.name || 'KPI'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentValue">Valor Atual</Label>
              <Input
                id="currentValue"
                type="number"
                value={formData.currentValue}
                onChange={(e) => handleChange('currentValue', e.target.value)}
                placeholder="75"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Meta</Label>
              <Input
                id="target"
                type="number"
                value={formData.target}
                onChange={(e) => handleChange('target', e.target.value)}
                placeholder="100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="previousValue">Valor Anterior</Label>
              <Input
                id="previousValue"
                type="number"
                value={formData.previousValue}
                onChange={(e) => handleChange('previousValue', e.target.value)}
                placeholder="70"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data da Medição</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_track">No Prazo</SelectItem>
                <SelectItem value="ahead">Avançado</SelectItem>
                <SelectItem value="behind">Atrasado</SelectItem>
                <SelectItem value="at_risk">Em Risco</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Descreva o progresso, desafios encontrados, próximos passos..."
              rows={4}
            />
          </div>

          {/* Indicador de Progresso */}
          {formData.currentValue && formData.target && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progresso Atual</span>
                <span className="text-sm font-bold text-gray-900">{calculateProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(calculateProgress(), 100)}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                <span>{formData.currentValue} / {formData.target}</span>
                <span>{formData.target - formData.currentValue} restante</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar Progresso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



