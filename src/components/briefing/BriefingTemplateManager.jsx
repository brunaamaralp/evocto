
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { useSession } from '@/components/auth/SessionManager';
import { BriefingTemplate } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  FileText, 
  Languages,
  Settings,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import CategoryEditor from './CategoryEditor';
import QuestionEditor from './QuestionEditor';

const DEFAULT_TEMPLATES = {
  social_media: {
    en: {
      name: "Social Media Management",
      categories: [
        {
          id: "company",
          name: "Company & Brand",
          questions: [
            {
              id: "sm_company_1",
              text: "Tell us about your company's mission and core values",
              type: "long_text",
              required: true,
              explanation: "This helps us understand your brand's essence and create authentic content",
              followUpTriggers: ["resposta_vaga", "menos_50_chars"]
            },
            {
              id: "sm_company_2", 
              text: "What makes your brand unique in the market?",
              type: "long_text",
              required: true,
              explanation: "Understanding your differentiators helps position your content strategically"
            }
          ]
        },
        {
          id: "audience",
          name: "Target Audience",
          questions: [
            {
              id: "sm_audience_1",
              text: "Describe your ideal customer in detail",
              type: "long_text",
              required: true,
              explanation: "The more specific you are, the better we can tailor content that resonates",
              followUpTriggers: ["resposta_vaga", "falta_detalhes"]
            }
          ]
        }
      ]
    },
    pt: {
      name: "Gestão de Redes Sociais",
      categories: [
        {
          id: "empresa",
          name: "Empresa e Marca",
          questions: [
            {
              id: "sm_empresa_1",
              text: "Conte-nos sobre a missão e valores centrais da sua empresa",
              type: "long_text",
              required: true,
              explanation: "Isso nos ajuda a entender a essência da sua marca e criar conteúdo autêntico",
              followUpTriggers: ["resposta_vaga", "menos_50_chars"]
            },
            {
              id: "sm_empresa_2",
              text: "O que torna sua marca única no mercado?",
              type: "long_text", 
              required: true,
              explanation: "Entender seus diferenciais ajuda a posicionar seu conteúdo estrategicamente"
            }
          ]
        },
        {
          id: "publico",
          name: "Público-Alvo",
          questions: [
            {
              id: "sm_publico_1",
              text: "Descreva seu cliente ideal em detalhes",
              type: "long_text",
              required: true,
              explanation: "Quanto mais específico, melhor conseguimos personalizar conteúdo que ressoa",
              followUpTriggers: ["resposta_vaga", "falta_detalhes"]
            }
          ]
        }
      ]
    }
  },
  trafego_pago: {
    en: {
      name: "Paid Traffic",
      categories: [
        {
          id: "objectives",
          name: "Campaign Objectives",
          questions: [
            {
              id: "pt_objectives_1",
              text: "What are your main goals with paid advertising?",
              type: "multiple_choice_multiple",
              required: true,
              options: ["Lead Generation", "Sales", "Brand Awareness", "App Downloads", "Website Traffic"],
              explanation: "Clear objectives help us optimize campaigns for the right metrics"
            }
          ]
        }
      ]
    },
    pt: {
      name: "Tráfego Pago",
      categories: [
        {
          id: "objetivos",
          name: "Objetivos da Campanha",
          questions: [
            {
              id: "pt_objetivos_1",
              text: "Quais são seus principais objetivos com publicidade paga?",
              type: "multiple_choice_multiple",
              required: true,
              options: ["Geração de Leads", "Vendas", "Awareness de Marca", "Downloads do App", "Tráfego para Site"],
              explanation: "Objetivos claros nos ajudam a otimizar campanhas para as métricas certas"
            }
          ]
        }
      ]
    }
  }
};

export default function BriefingTemplateManager({ serviceType }) {
  const { t, currentLanguage } = useTranslation();
  const { agency } = useSession();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const createDefaultTemplate = useCallback(async () => {
    const defaultTemplate = DEFAULT_TEMPLATES[serviceType]?.[currentLanguage];
    if (!defaultTemplate) return;

    const templateData = {
      agencyId: agency.id,
      serviceType,
      name: defaultTemplate.name,
      description: `Default ${defaultTemplate.name} briefing template`,
      language: currentLanguage,
      categories: defaultTemplate.categories.map((cat, index) => ({
        ...cat,
        order: index + 1,
        questions: cat.questions.map((q, qIndex) => ({
          ...q,
          order: qIndex + 1
        }))
      })),
      followUpQuestions: [],
      aiSettings: {
        enableAISuggestions: true,
        validationSensitivity: 'medium'
      },
      version: '1.0',
      isDefault: false,
      isActive: true
    };

    await BriefingTemplate.create(templateData);
    toast.success(t('briefing.templates.success.defaultCreated'));
  }, [agency?.id, serviceType, currentLanguage, t]); // Added dependencies for useCallback

  const loadTemplates = useCallback(async () => {
    if (!agency?.id || !serviceType) return;

    try {
      setLoading(true);
      setError(null);

      // Carregar templates personalizados da agência
      const customTemplates = await BriefingTemplate.filter({
        agencyId: agency.id,
        serviceType,
        isActive: true
      });

      // Se não há template personalizado, criar baseado no padrão
      if (customTemplates.length === 0) {
        await createDefaultTemplate(); // This is now a useCallback
        // Recarregar após criar
        const newTemplates = await BriefingTemplate.filter({
          agencyId: agency.id,
          serviceType,
          isActive: true
        });
        setTemplates(newTemplates);
      } else {
        setTemplates(customTemplates);
      }

    } catch (err) {
      console.error('Error loading templates:', err);
      setError(t('briefing.templates.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [agency?.id, serviceType, t, createDefaultTemplate]); // Added createDefaultTemplate to dependencies

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateTemplate = () => {
    setEditingTemplate({
      agencyId: agency.id,
      serviceType,
      name: '',
      description: '',
      language: currentLanguage,
      categories: [],
      followUpQuestions: [],
      aiSettings: {
        enableAISuggestions: true,
        validationSensitivity: 'medium'
      },
      version: '1.0',
      isActive: true
    });
    setShowEditor(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate({ ...template });
    setShowEditor(true);
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      if (templateData.id) {
        await BriefingTemplate.update(templateData.id, templateData);
        toast.success(t('briefing.templates.success.updated'));
      } else {
        await BriefingTemplate.create(templateData);
        toast.success(t('briefing.templates.success.created'));
      }
      
      setShowEditor(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error(t('briefing.templates.errors.saveFailed'));
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm(t('briefing.templates.confirmDelete'))) return;

    try {
      await BriefingTemplate.update(templateId, { isActive: false });
      toast.success(t('briefing.templates.success.deleted'));
      loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error(t('briefing.templates.errors.deleteFailed'));
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const duplicatedTemplate = {
        ...template,
        id: undefined,
        name: `${template.name} (Copy)`,
        version: '1.0',
        created_date: undefined,
        updated_date: undefined
      };

      await BriefingTemplate.create(duplicatedTemplate);
      toast.success(t('briefing.templates.success.duplicated'));
      loadTemplates();
    } catch (err) {
      console.error('Error duplicating template:', err);
      toast.error(t('briefing.templates.errors.duplicateFailed'));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">{t('briefing.templates.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {t('briefing.templates.title')}
          </h2>
          <p className="text-slate-600 mt-1">
            {t('briefing.templates.subtitle')}
          </p>
        </div>
        <Button onClick={handleCreateTemplate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          {t('briefing.templates.actions.create')}
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {templates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          <Languages className="w-3 h-3 mr-1" />
                          {template.language.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          v{template.version}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>{template.categories?.length || 0} categories</span>
                      <span>
                        {template.categories?.reduce((total, cat) => total + (cat.questions?.length || 0), 0) || 0} questions
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        className="flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        {t('cta.edit')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm" 
                        onClick={() => handleDuplicateTemplate(template)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? t('briefing.templates.actions.edit') : t('briefing.templates.actions.create')} Template
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TemplateEditor
              template={editingTemplate}
              onSave={handleSaveTemplate}
              onCancel={() => {
                setShowEditor(false);
                setEditingTemplate(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Template Editor Component
function TemplateEditor({ template, onSave, onCancel }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(template);
  const [activeTab, setActiveTab] = useState('basic');

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error(t('briefing.templates.errors.nameRequired'));
      return;
    }

    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">{t('briefing.templates.tabs.basic')}</TabsTrigger>
          <TabsTrigger value="categories">{t('briefing.templates.tabs.categories')}</TabsTrigger>
          <TabsTrigger value="settings">{t('briefing.templates.tabs.settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('briefing.templates.fields.name')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('briefing.templates.placeholders.name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('briefing.templates.fields.version')}
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({...formData, version: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('briefing.templates.fields.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder={t('briefing.templates.placeholders.description')}
            />
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <CategoryEditor
            categories={formData.categories || []}
            onChange={(categories) => setFormData({...formData, categories})}
          />
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{t('briefing.templates.settings.enableAI')}</h4>
                <p className="text-sm text-slate-600">{t('briefing.templates.settings.enableAIDescription')}</p>
              </div>
              <input
                type="checkbox"
                checked={formData.aiSettings?.enableAISuggestions || false}
                onChange={(e) => setFormData({
                  ...formData,
                  aiSettings: {
                    ...formData.aiSettings,
                    enableAISuggestions: e.target.checked
                  }
                })}
                className="toggle"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('briefing.templates.settings.validationSensitivity')}
              </label>
              <select
                value={formData.aiSettings?.validationSensitivity || 'medium'}
                onChange={(e) => setFormData({
                  ...formData,
                  aiSettings: {
                    ...formData.aiSettings,
                    validationSensitivity: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">{t('briefing.templates.settings.sensitivityLow')}</option>
                <option value="medium">{t('briefing.templates.settings.sensitivityMedium')}</option>
                <option value="high">{t('briefing.templates.settings.sensitivityHigh')}</option>
              </select>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          {t('cta.cancel')}
        </Button>
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          {t('cta.save')}
        </Button>
      </div>
    </div>
  );
}
