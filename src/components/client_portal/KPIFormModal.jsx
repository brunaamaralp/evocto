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
import { 
  BarChart3, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Target,
  DollarSign,
  Users,
  ShoppingCart
} from 'lucide-react';
import { useClientGoalsKPIs } from '@/hooks/useClientGoalsKPIs';
import { toast } from 'sonner';

/**
 * Modal para criação de novos KPIs
 */
export default function KPIFormModal({ 
  isOpen, 
  onClose, 
  clientId, 
  serviceId,
  onSuccess 
}) {
  const { createKPI, loading } = useClientGoalsKPIs();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'business',
    unit: '',
    targetValue: '',
    frequency: 'monthly',
    direction: 'increase',
    formula: '',
    dataSource: ''
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.description.trim()) newErrors.description = 'Descrição é obrigatória';
    if (!formData.unit.trim()) newErrors.unit = 'Unidade é obrigatória';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await createKPI({
        ...formData,
        clientId,
        serviceId,
        targetValue: formData.targetValue ? parseFloat(formData.targetValue) : null
      });
      
      onSuccess();
      handleClose();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      category: 'business',
      unit: '',
      targetValue: '',
      frequency: 'monthly',
      direction: 'increase',
      formula: '',
      dataSource: ''
    });
    setErrors({});
    onClose();
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'business': return BarChart3;
      case 'marketing': return TrendingUp;
      case 'sales': return ShoppingCart;
      case 'finance': return DollarSign;
      case 'customers': return Users;
      default: return Target;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'business': return 'text-blue-600';
      case 'marketing': return 'text-green-600';
      case 'sales': return 'text-purple-600';
      case 'finance': return 'text-yellow-600';
      case 'customers': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  const getDirectionIcon = (direction) => {
    return direction === 'increase' ? TrendingUp : TrendingUp;
  };

  const getDirectionColor = (direction) => {
    return direction === 'increase' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Novo KPI
          </DialogTitle>
          <DialogDescription>
            Configure um novo indicador de performance para monitorar seus resultados.
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
                <Label htmlFor="name">Nome do KPI *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Taxa de Conversão"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o que este KPI mede e por que é importante..."
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
                  <Label htmlFor="category">Categoria</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          Negócio
                        </div>
                      </SelectItem>
                      <SelectItem value="marketing">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          Marketing
                        </div>
                      </SelectItem>
                      <SelectItem value="sales">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-purple-600" />
                          Vendas
                        </div>
                      </SelectItem>
                      <SelectItem value="finance">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-yellow-600" />
                          Financeiro
                        </div>
                      </SelectItem>
                      <SelectItem value="customers">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-pink-600" />
                          Clientes
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequência de Medição</Label>
                  <Select 
                    value={formData.frequency} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Medição */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Configurações de Medição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade de Medição *</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Ex: %, R$, unidades"
                    className={errors.unit ? 'border-red-500' : ''}
                  />
                  {errors.unit && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.unit}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetValue">Valor Alvo (Opcional)</Label>
                  <Input
                    id="targetValue"
                    type="number"
                    step="0.01"
                    value={formData.targetValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetValue: e.target.value }))}
                    placeholder="Ex: 15.5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direction">Direção Desejada</Label>
                <Select 
                  value={formData.direction} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, direction: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        Aumentar
                      </div>
                    </SelectItem>
                    <SelectItem value="decrease">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                        Diminuir
                      </div>
                    </SelectItem>
                    <SelectItem value="maintain">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        Manter
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formula">Fórmula de Cálculo (Opcional)</Label>
                <Input
                  id="formula"
                  value={formData.formula}
                  onChange={(e) => setFormData(prev => ({ ...prev, formula: e.target.value }))}
                  placeholder="Ex: (vendas / visitantes) * 100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataSource">Fonte de Dados (Opcional)</Label>
                <Input
                  id="dataSource"
                  value={formData.dataSource}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataSource: e.target.value }))}
                  placeholder="Ex: Google Analytics, CRM, Planilha"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview do KPI */}
          {formData.name && formData.description && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-purple-900">Preview do KPI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      {React.createElement(getCategoryIcon(formData.category), { 
                        className: `w-4 h-4 ${getCategoryColor(formData.category)}` 
                      })}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-900">{formData.name}</h4>
                      <p className="text-sm text-purple-800">{formData.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-purple-700">
                      <BarChart3 className="w-4 h-4" />
                      {formData.unit}
                    </div>
                    {formData.targetValue && (
                      <div className="flex items-center gap-1 text-purple-700">
                        <Target className="w-4 h-4" />
                        Meta: {formData.targetValue} {formData.unit}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 ${getDirectionColor(formData.direction)}`}>
                      {React.createElement(getDirectionIcon(formData.direction), { className: "w-4 h-4" })}
                      {formData.direction === 'increase' ? 'Aumentar' : 
                       formData.direction === 'decrease' ? 'Diminuir' : 'Manter'}
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
            className="bg-purple-600 hover:bg-purple-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? 'Criando...' : 'Criar KPI'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

