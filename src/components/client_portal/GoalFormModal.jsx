import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Target, 
  Calendar as CalendarIcon, 
  AlertCircle,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import { useClientGoalsKPIs } from '@/hooks/useClientGoalsKPIs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

/**
 * Modal para criação de novas metas
 */
export default function GoalFormModal({ 
  isOpen, 
  onClose, 
  clientId, 
  serviceId,
  onSuccess 
}) {
  const { createGoal, loading } = useClientGoalsKPIs();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetDate: null,
    priority: 'medium',
    category: 'business',
    targetValue: '',
    unit: '',
    successCriteria: ''
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Título é obrigatório';
    if (!formData.description.trim()) newErrors.description = 'Descrição é obrigatória';
    if (!formData.targetDate) newErrors.targetDate = 'Data alvo é obrigatória';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await createGoal({
        ...formData,
        clientId,
        serviceId,
        targetDate: formData.targetDate.toISOString()
      });
      
      onSuccess();
      handleClose();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      targetDate: null,
      priority: 'medium',
      category: 'business',
      targetValue: '',
      unit: '',
      successCriteria: ''
    });
    setErrors({});
    onClose();
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return Star;
      case 'medium': return Target;
      case 'low': return Clock;
      default: return Target;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Nova Meta
          </DialogTitle>
          <DialogDescription>
            Defina uma nova meta para acompanhar seu progresso e alcançar seus objetivos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Meta *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Aumentar vendas em 20%"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva detalhadamente o que você quer alcançar..."
                  rows={3}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-red-600" />
                          Alta Prioridade
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-yellow-600" />
                          Média Prioridade
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          Baixa Prioridade
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Negócio</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="sales">Vendas</SelectItem>
                      <SelectItem value="finance">Financeiro</SelectItem>
                      <SelectItem value="operations">Operações</SelectItem>
                      <SelectItem value="personal">Pessoal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prazo e Objetivos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Prazo e Objetivos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data Alvo *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !formData.targetDate ? 'text-muted-foreground' : ''
                      } ${errors.targetDate ? 'border-red-500' : ''}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.targetDate ? (
                        format(formData.targetDate, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        'Selecione uma data'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.targetDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, targetDate: date }))}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.targetDate && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.targetDate}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetValue">Valor Alvo (Opcional)</Label>
                  <Input
                    id="targetValue"
                    type="number"
                    value={formData.targetValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetValue: e.target.value }))}
                    placeholder="Ex: 100000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Ex: R$, %, unidades"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="successCriteria">Critérios de Sucesso</Label>
                <Textarea
                  id="successCriteria"
                  value={formData.successCriteria}
                  onChange={(e) => setFormData(prev => ({ ...prev, successCriteria: e.target.value }))}
                  placeholder="Descreva como você saberá que a meta foi alcançada..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview da Meta */}
          {formData.title && formData.description && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-900">Preview da Meta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">{formData.title}</h4>
                      <p className="text-sm text-blue-800">{formData.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    {formData.targetDate && (
                      <div className="flex items-center gap-1 text-blue-700">
                        <CalendarIcon className="w-4 h-4" />
                        {format(formData.targetDate, 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 ${getPriorityColor(formData.priority)}`}>
                      {React.createElement(getPriorityIcon(formData.priority), { className: "w-4 h-4" })}
                      {formData.priority === 'high' ? 'Alta' : 
                       formData.priority === 'medium' ? 'Média' : 'Baixa'} Prioridade
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </form>

        <DialogFooter className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? 'Criando...' : 'Criar Meta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

