import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ServiceSettingsForm({ service, onSave }) {
  const [formData, setFormData] = useState({});
  const [initialData, setInitialData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const data = {
      name: service?.name || '',
      description: service?.description || '',
      category: service?.category || 'marketing_digital',
      billing_cycle: service?.pricing?.billing_cycle || 'monthly',
      cycle_frequency: service?.cycle_frequency || 'monthly',
      start_date: service?.start_date ? format(parseISO(service.start_date), 'yyyy-MM-dd') : '',
      timezone: service?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      approval_policy: service?.approval_policy || 'manual_approve',
      is_active: service?.is_active ?? true,
    };
    setFormData(data);
    setInitialData(data);
    setIsDirty(false);
  }, [service]);

  useEffect(() => {
    setIsDirty(JSON.stringify(formData) !== JSON.stringify(initialData));
  }, [formData, initialData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const dataToSave = {
      ...formData,
      pricing: { // Recriar o objeto de pricing para o schema
        ...service.pricing,
        billing_cycle: formData.billing_cycle,
      }
    };
    delete dataToSave.billing_cycle; // Remove o campo duplicado

    const success = await onSave(dataToSave);
    if (success) {
      setInitialData(formData);
      setIsDirty(false);
    }
    setIsSubmitting(false);
  };
  
  const isOneTimeService = formData.billing_cycle === 'one_time';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Detalhes Principais</CardTitle>
          <CardDescription>Informações básicas que identificam e descrevem o serviço.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Serviço</Label>
            <Input id="name" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={formData.description || ''} onChange={e => handleChange('description', e.target.value)} placeholder="Descreva o escopo e os objetivos principais deste serviço..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={formData.category || ''} onValueChange={value => handleChange('category', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="marketing_digital">Marketing Digital</SelectItem>
                <SelectItem value="branding">Branding</SelectItem>
                <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                <SelectItem value="consultoria">Consultoria</SelectItem>
                <SelectItem value="midia_paga">Mídia Paga</SelectItem>
                <SelectItem value="organico">Orgânico</SelectItem>
                <SelectItem value="produto">Produto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras do Contrato</CardTitle>
          <CardDescription>Definições operacionais que a IA usará para o planejamento.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="billing_cycle">Ciclo de Faturamento</Label>
            <Select value={formData.billing_cycle || ''} onValueChange={value => handleChange('billing_cycle', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
                <SelectItem value="one_time">Pagamento Único</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycle_frequency">Frequência do Ciclo</Label>
            <Select value={formData.cycle_frequency || ''} onValueChange={value => handleChange('cycle_frequency', value)} disabled={isOneTimeService}>
              <SelectTrigger><SelectValue placeholder={isOneTimeService ? "N/A" : "Selecione..."} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_date">Data de Início</Label>
            <Input id="start_date" type="date" value={formData.start_date || ''} onChange={e => handleChange('start_date', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Fuso Horário</Label>
            <Input id="timezone" value={formData.timezone || ''} onChange={e => handleChange('timezone', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="approval_policy">Política de Aprovação</Label>
            <Select value={formData.approval_policy || ''} onValueChange={value => handleChange('approval_policy', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_approve">Manual</SelectItem>
                <SelectItem value="auto_approve">Automática</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 pt-6">
             <Switch id="is_active" checked={formData.is_active} onCheckedChange={value => handleChange('is_active', value)} />
            <Label htmlFor="is_active">Serviço Ativo</Label>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
}