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
  Target,
  TrendingUp,
  Save,
  X
} from 'lucide-react';

/**
 * Modal para registrar/editar KPIs
 */
export default function KPIRecordModal({ 
  isOpen, 
  onClose, 
  kpi = null, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    name: kpi?.name || '',
    description: kpi?.description || '',
    target: kpi?.target || '',
    current: kpi?.current || '',
    unit: kpi?.unit || 'percent',
    category: kpi?.category || 'financial',
    priority: kpi?.priority || 'medium',
    deadline: kpi?.deadline || '',
    notes: kpi?.notes || ''
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {kpi ? 'Editar KPI' : 'Novo KPI'}
          </DialogTitle>
          <DialogDescription>
            {kpi ? 'Atualize as informações do KPI' : 'Registre um novo indicador de performance'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do KPI</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Margem de Lucro"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financeiro</SelectItem>
                  <SelectItem value="operational">Operacional</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="quality">Qualidade</SelectItem>
                  <SelectItem value="growth">Crescimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descreva o que este KPI mede..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Meta</Label>
              <Input
                id="target"
                type="number"
                value={formData.target}
                onChange={(e) => handleChange('target', e.target.value)}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current">Valor Atual</Label>
              <Input
                id="current"
                type="number"
                value={formData.current}
                onChange={(e) => handleChange('current', e.target.value)}
                placeholder="75"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Select value={formData.unit} onValueChange={(value) => handleChange('unit', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">%</SelectItem>
                  <SelectItem value="currency">R$</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Prazo</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {kpi ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



