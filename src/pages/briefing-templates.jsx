import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  FileText, 
  Edit, 
  Copy, 
  Trash2, 
  Eye,
  Settings,
  Loader2
} from 'lucide-react';
import { BriefingTemplate } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import BriefingTemplateEditor from '@/components/briefing/BriefingTemplateEditor';
import { SERVICE_CATEGORIES, DEFAULT_SERVICE_CATEGORY } from '@/constants/serviceCategories';

const CATEGORY_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-amber-100 text-amber-800',
  'bg-red-100 text-red-800',
  'bg-indigo-100 text-indigo-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
];

const BRIEFING_SERVICE_CATEGORIES = Object.fromEntries(
  Object.entries(SERVICE_CATEGORIES).map(([key, name], index) => [
    key,
    {
      name,
      description: `Templates de briefing para serviços de ${name.toLowerCase()}`,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    },
  ])
);

export default function BriefingTemplatesPage() {
  const { user, agencyId } = useSession();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(DEFAULT_SERVICE_CATEGORY);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const loadTemplates = useCallback(async () => {
    if (!agencyId) return;

    try {
      setLoading(true);
      const allTemplates = await BriefingTemplate.filter({ agencyId });
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const createDefaultTemplates = async () => {
    try {
      setLoading(true);
      const { createFinancialBriefingTemplates } = await import('@/api/functions');
      const result = await createFinancialBriefingTemplates({});
      
      if (result.data?.success) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Erro ao criar templates padrão:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleClone = async (template) => {
    const clonedTemplate = {
      ...template,
      name: `${template.name} (Cópia)`,
      version: '1.0'
    };
    delete clonedTemplate.id;
    
    setEditingTemplate(clonedTemplate);
    setShowEditor(true);
  };

  const handleDelete = async (templateId) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      try {
        await BriefingTemplate.delete(templateId);
        await loadTemplates();
      } catch (error) {
        console.error('Erro ao excluir template:', error);
      }
    }
  };

  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.serviceType || DEFAULT_SERVICE_CATEGORY;
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Templates de Briefing</h1>
            <p className="text-gray-600 mt-1">
              Configure perguntas personalizadas para cada tipo de serviço
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={createDefaultTemplates} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
              Criar Templates Padrão
            </Button>
            <Button onClick={() => {
              setEditingTemplate(null);
              setShowEditor(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex flex-wrap h-auto gap-1 w-full">
            {Object.entries(BRIEFING_SERVICE_CATEGORIES).map(([key, category]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(BRIEFING_SERVICE_CATEGORIES).map(([categoryKey, category]) => (
            <TabsContent key={categoryKey} value={categoryKey} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Badge className={category.color}>{category.name}</Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setEditingTemplate({ 
                          serviceType: categoryKey,
                          language: 'pt',
                          categories: [],
                          followUpQuestions: [],
                          aiSettings: {
                            enableAISuggestions: true,
                            validationSensitivity: 'medium'
                          }
                        });
                        setShowEditor(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Novo para {category.name}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Carregando templates...
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {templatesByCategory[categoryKey]?.length > 0 ? (
                        templatesByCategory[categoryKey].map((template) => (
                          <Card key={template.id} className="border border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                    <span>Versão: {template.version}</span>
                                    <span>Categorias: {template.categories?.length || 0}</span>
                                    <span>
                                      Perguntas: {template.categories?.reduce((sum, cat) => sum + (cat.questions?.length || 0), 0) || 0}
                                    </span>
                                    {template.isDefault && (
                                      <Badge variant="outline" className="bg-gray-50">Padrão</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleClone(template)}>
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  {!template.isDefault && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDelete(template.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Nenhum template criado para esta categoria</p>
                          <p className="text-sm">Clique em "Novo" para criar o primeiro template</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <BriefingTemplateEditor
          template={editingTemplate}
          isOpen={showEditor}
          onClose={() => {
            setShowEditor(false);
            setEditingTemplate(null);
          }}
          onSave={async (template) => {
            setShowEditor(false);
            setEditingTemplate(null);
            await loadTemplates();
          }}
        />
      )}
    </div>
  );
}