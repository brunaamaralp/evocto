import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  AlertCircle,
  Loader2,
  GripVertical,
  Settings
} from 'lucide-react';
import { BriefingTemplate } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';

const QUESTION_TYPES = {
  long_text: 'Texto Longo',
  short_text: 'Texto Curto',
  multiple_choice: 'Múltipla Escolha',
  multiple_choice_multiple: 'Múltipla Escolha (Múltiplas)',
  number: 'Número',
  email: 'E-mail',
  url: 'URL',
  currency: 'Valor Monetário',
  percentage: 'Porcentagem',
  date: 'Data'
};

export default function BriefingTemplateEditor({ template, isOpen, onClose, onSave }) {
  const { agencyId } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    serviceType: 'gestao_financeira',
    language: 'pt',
    version: '1.0',
    categories: [],
    followUpQuestions: [],
    aiSettings: {
      enableAISuggestions: true,
      validationSensitivity: 'medium'
    }
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        serviceType: template.serviceType || 'gestao_financeira',
        language: template.language || 'pt',
        version: template.version || '1.0',
        categories: template.categories || [],
        followUpQuestions: template.followUpQuestions || [],
        aiSettings: template.aiSettings || {
          enableAISuggestions: true,
          validationSensitivity: 'medium'
        }
      });
    }
  }, [template]);

  const handleSave = async () => {
    if (!formData.name || !formData.serviceType) {
      setError('Nome e tipo de serviço são obrigatórios');
      return;
    }

    if (!formData.categories.length) {
      setError('É necessário pelo menos uma categoria com perguntas');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const templateData = {
        ...formData,
        agencyId,
        isActive: true
      };

      if (template?.id) {
        await BriefingTemplate.update(template.id, templateData);
      } else {
        await BriefingTemplate.create(templateData);
      }

      onSave && onSave(templateData);
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      setError(`Erro ao salvar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    const newCategory = {
      id: `cat_${Date.now()}`,
      name: 'Nova Categoria',
      description: '',
      order: formData.categories.length + 1,
      questions: []
    };

    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }));
  };

  const updateCategory = (categoryId, updates) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => 
        cat.id === categoryId ? { ...cat, ...updates } : cat
      )
    }));
  };

  const deleteCategory = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== categoryId)
    }));
  };

  const addQuestion = (categoryId) => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      text: '',
      type: 'short_text',
      required: false,
      placeholder: '',
      explanation: '',
      options: [],
      order: 0
    };

    updateCategory(categoryId, {
      questions: [...(formData.categories.find(c => c.id === categoryId)?.questions || []), newQuestion]
    });
  };

  const updateQuestion = (categoryId, questionId, updates) => {
    const category = formData.categories.find(c => c.id === categoryId);
    if (!category) return;

    const updatedQuestions = category.questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    );

    updateCategory(categoryId, { questions: updatedQuestions });
  };

  const deleteQuestion = (categoryId, questionId) => {
    const category = formData.categories.find(c => c.id === categoryId);
    if (!category) return;

    updateCategory(categoryId, {
      questions: category.questions.filter(q => q.id !== questionId)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template?.id ? 'Editar Template' : 'Novo Template'} de Briefing
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="categories">Categorias & Perguntas</TabsTrigger>
            <TabsTrigger value="settings">Configurações IA</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Template</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Diagnóstico Financeiro Completo"
                    />
                  </div>
                  <div>
                    <Label>Tipo de Serviço</Label>
                    <Select
                      value={formData.serviceType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, serviceType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gestao_financeira">Gestão Financeira</SelectItem>
                        <SelectItem value="consultoria_tributaria">Consultoria Tributária</SelectItem>
                        <SelectItem value="valuation">Valuation</SelectItem>
                        <SelectItem value="planejamento_financeiro">Planejamento Financeiro</SelectItem>
                        <SelectItem value="fusao_aquisicao">Fusão e Aquisição</SelectItem>
                        <SelectItem value="reestruturacao">Reestruturação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva o propósito deste template..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Categorias de Perguntas</h3>
              <Button onClick={addCategory} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Categoria
              </Button>
            </div>

            <div className="space-y-4">
              {formData.categories.map((category, categoryIndex) => (
                <Card key={category.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={category.name}
                          onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                          placeholder="Nome da categoria"
                          className="font-semibold"
                        />
                        <Input
                          value={category.description}
                          onChange={(e) => updateCategory(category.id, { description: e.target.value })}
                          placeholder="Descrição da categoria"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addQuestion(category.id)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCategory(category.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.questions?.map((question, questionIndex) => (
                        <Card key={question.id} className="bg-gray-50">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                  <Input
                                    value={question.text}
                                    onChange={(e) => updateQuestion(category.id, question.id, { text: e.target.value })}
                                    placeholder="Texto da pergunta"
                                    className="flex-1"
                                  />
                                  <Select
                                    value={question.type}
                                    onValueChange={(value) => updateQuestion(category.id, question.id, { type: value })}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(QUESTION_TYPES).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {['multiple_choice', 'multiple_choice_multiple'].includes(question.type) && (
                                  <div>
                                    <Label className="text-xs">Opções (uma por linha)</Label>
                                    <Textarea
                                      value={question.options?.join('\n') || ''}
                                      onChange={(e) => updateQuestion(category.id, question.id, { 
                                        options: e.target.value.split('\n').filter(o => o.trim()) 
                                      })}
                                      placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                                      rows={3}
                                      className="text-xs"
                                    />
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={question.placeholder || ''}
                                    onChange={(e) => updateQuestion(category.id, question.id, { placeholder: e.target.value })}
                                    placeholder="Placeholder (opcional)"
                                    className="text-xs"
                                  />
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={question.required || false}
                                      onChange={(e) => updateQuestion(category.id, question.id, { required: e.target.checked })}
                                      className="rounded"
                                    />
                                    <Label className="text-xs">Obrigatória</Label>
                                  </div>
                                </div>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteQuestion(category.id, question.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {(!category.questions || category.questions.length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                          <p className="text-sm">Nenhuma pergunta nesta categoria</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addQuestion(category.id)}
                            className="mt-2"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Primeira Pergunta
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {formData.categories.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhuma categoria criada</p>
                  <Button onClick={addCategory} variant="outline" className="mt-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Categoria
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurações de IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.aiSettings.enableAISuggestions}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      aiSettings: {
                        ...prev.aiSettings,
                        enableAISuggestions: e.target.checked
                      }
                    }))}
                    className="rounded"
                  />
                  <Label>Habilitar sugestões de IA durante preenchimento</Label>
                </div>

                <div>
                  <Label>Sensibilidade da Validação</Label>
                  <Select
                    value={formData.aiSettings.validationSensitivity}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      aiSettings: {
                        ...prev.aiSettings,
                        validationSensitivity: value
                      }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa - Aceita respostas básicas</SelectItem>
                      <SelectItem value="medium">Média - Validação equilibrada</SelectItem>
                      <SelectItem value="high">Alta - Exige respostas detalhadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}