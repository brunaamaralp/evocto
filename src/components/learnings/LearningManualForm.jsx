import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { X, Save, Plus, Link, Users, Briefcase, CheckSquare } from 'lucide-react';
import { useLearningManagement } from '@/hooks/useLearningManagement';
import { useSession } from '@/components/auth/SessionManager';
import { Client, Service, Task } from '@/api/entities';
import { toast } from 'sonner';

/**
 * Formulário funcional para criação manual de aprendizados
 * Inclui vinculação com clientes, serviços e tarefas
 */
export default function LearningManualForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData = null,
  context = {} // { clientId, serviceId, taskId }
}) {
  const { agency } = useSession();
  const {
    createLearning,
    updateLearning,
    loading,
    error
  } = useLearningManagement();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    niche: '',
    format: '',
    trigger: '',
    promise: '',
    rationale: '',
    tags: [],
    clientId: '',
    serviceId: '',
    taskId: '',
    isShared: false
  });

  const [availableClients, setAvailableClients] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Aplicar dados iniciais
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        niche: initialData.niche || '',
        format: initialData.format || '',
        trigger: initialData.trigger || '',
        promise: initialData.promise || '',
        rationale: initialData.rationale || '',
        tags: initialData.tags || [],
        clientId: initialData.clientId || context.clientId || '',
        serviceId: initialData.serviceId || context.serviceId || '',
        taskId: initialData.taskId || context.taskId || '',
        isShared: initialData.isShared || false
      });
    }
  }, [initialData, context]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const [clients, services, tasks] = await Promise.all([
        Client.filter({ agencyId: agency.id }),
        Service.filter({ agencyId: agency.id }),
        Task.filter({ agencyId: agency.id })
      ]);

      setAvailableClients(clients || []);
      setAvailableServices(services || []);
      setAvailableTasks(tasks || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      toast.error('Erro ao carregar dados para vinculação');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  const addTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(tag => tag !== tagToRemove) 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (initialData) {
        // Atualizar aprendizado existente
        await updateLearning(initialData.id, formData);
      } else {
        // Criar novo aprendizado
        await createLearning(formData);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      // Erro já tratado no hook
    }
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      niche: '',
      format: '',
      trigger: '',
      promise: '',
      rationale: '',
      tags: [],
      clientId: '',
      serviceId: '',
      taskId: '',
      isShared: false
    });
    onClose();
  };

  const formatOptions = [
    'Post Orgânico',
    'Stories',
    'E-mail Marketing',
    'Anúncio Pago',
    'Vídeo',
    'Podcast',
    'Webinar',
    'E-book',
    'Infográfico',
    'Case Study',
    'Testimonial',
    'Landing Page',
    'Blog Post',
    'Newsletter',
    'Outro'
  ];

  const triggerOptions = [
    'Urgência',
    'Escassez',
    'Prova Social',
    'Autoridade',
    'Reciprocidade',
    'Compromisso',
    'Afinidade',
    'Curiosidade',
    'Medo de Perder',
    'Ganância',
    'Outro'
  ];

  const nicheOptions = [
    'SaaS B2B',
    'E-commerce',
    'Consultoria',
    'Educação',
    'Saúde',
    'Finanças',
    'Tecnologia',
    'Moda',
    'Beleza',
    'Alimentação',
    'Imobiliário',
    'Automotivo',
    'Turismo',
    'Entretenimento',
    'Outro'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {initialData ? "Editar Aprendizado" : "Adicionar Aprendizado Manual"}
          </DialogTitle>
          <DialogDescription>
            Registre insights, estratégias e aprendizados para construir o playbook da agência.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Aprendizado *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Ex: Campanha de Black Friday com urgência"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niche">Nicho de Mercado *</Label>
                  <Select value={formData.niche} onValueChange={(value) => handleChange('niche', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nicho" />
                    </SelectTrigger>
                    <SelectContent>
                      {nicheOptions.map(niche => (
                        <SelectItem key={niche} value={niche}>{niche}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição Detalhada *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Descreva o aprendizado, estratégia ou insight em detalhes..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="format">Formato/Canal *</Label>
                  <Select value={formData.format} onValueChange={(value) => handleChange('format', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map(format => (
                        <SelectItem key={format} value={format}>{format}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger">Gatilho Psicológico</Label>
                  <Select value={formData.trigger} onValueChange={(value) => handleChange('trigger', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gatilho" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerOptions.map(trigger => (
                        <SelectItem key={trigger} value={trigger}>{trigger}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promise">Promessa Central</Label>
                <Input
                  id="promise"
                  value={formData.promise}
                  onChange={(e) => handleChange('promise', e.target.value)}
                  placeholder="Ex: Aumente suas vendas em 30% em 30 dias"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rationale">Por que Funcionou?</Label>
                <Textarea
                  id="rationale"
                  value={formData.rationale}
                  onChange={(e) => handleChange('rationale', e.target.value)}
                  placeholder="Explique o contexto, timing, audiência e por que esta estratégia funcionou..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categorização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  value={formData.tags.join(', ')}
                  onChange={handleTagsChange}
                  placeholder="Ex: conversão, engajamento, retenção, aquisição"
                />
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {['conversão', 'engajamento', 'retenção', 'aquisição', 'branding', 'vendas'].map(tag => (
                  <Button
                    key={tag}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTag(tag)}
                    disabled={formData.tags.includes(tag)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vinculação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link className="w-5 h-5" />
                Vinculação com Outros Módulos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Cliente
                  </Label>
                  <Select value={formData.clientId} onValueChange={(value) => handleChange('clientId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum cliente</SelectItem>
                      {availableClients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceId" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Serviço
                  </Label>
                  <Select value={formData.serviceId} onValueChange={(value) => handleChange('serviceId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum serviço</SelectItem>
                      {availableServices.map(service => (
                        <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taskId" className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Tarefa
                  </Label>
                  <Select value={formData.taskId} onValueChange={(value) => handleChange('taskId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a tarefa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma tarefa</SelectItem>
                      {availableTasks.map(task => (
                        <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isShared"
                  checked={formData.isShared}
                  onChange={(e) => handleChange('isShared', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isShared" className="text-sm">
                  Compartilhar com toda a agência (Playbook)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <DialogFooter className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || loadingData}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvando...' : (initialData ? 'Atualizar' : 'Salvar')} Aprendizado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

