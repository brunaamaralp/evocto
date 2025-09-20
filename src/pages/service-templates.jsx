import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Copy, 
  Trash2,
  Download,
  Upload,
  Settings
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Service } from '@/api/entities';
import { toast } from 'sonner';
import ServiceTemplateForm from '@/components/services/ServiceTemplateForm';
import ImportTemplateModal from '@/components/services/ImportTemplateModal';
import { exportServiceTemplates } from '@/api/functions/exportServiceTemplates';

export default function ServiceTemplatesPage() {
  const { user, agencyId, loading: sessionLoading } = useSession();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const templatesData = await Service.filter({ 
        agencyId, 
        is_template: true 
      });
      
      console.log('📋 Templates carregados:', templatesData.length);
      setTemplates(templatesData);
    } catch (error) {
      console.error('❌ Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    if (agencyId) {
      loadTemplates();
    }
  }, [agencyId, loadTemplates]);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleEditTemplate = (template) => {
    console.log('✏️ Editando template:', template.name);
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleCloneTemplate = async (template) => {
    try {
      console.log('📋 Clonando template:', template.name);
      
      const clonedTemplate = {
        ...template,
        name: `${template.name} (Cópia)`,
        agencyId,
        is_template: true,
        is_active: true
      };
      
      // Remove campos que não devem ser duplicados
      delete clonedTemplate.id;
      delete clonedTemplate.created_date;
      delete clonedTemplate.updated_date;
      
      await Service.create(clonedTemplate);
      toast.success('Template clonado com sucesso!');
      loadTemplates();
    } catch (error) {
      console.error('❌ Erro ao clonar template:', error);
      toast.error('Erro ao clonar template');
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (!confirm(`Tem certeza que deseja excluir o template "${template.name}"?`)) {
      return;
    }

    try {
      console.log('🗑️ Excluindo template:', template.name);
      await Service.delete(template.id);
      toast.success('Template excluído com sucesso!');
      loadTemplates();
    } catch (error) {
      console.error('❌ Erro ao excluir template:', error);
      toast.error('Erro ao excluir template');
    }
  };

  const handleExport = async () => {
    try {
      const response = await exportServiceTemplates();
      
      if (response.data) {
        // Criar blob e fazer download
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `templates_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Templates exportados com sucesso!');
      } else {
        toast.error('Erro ao exportar: Nenhum dado recebido');
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      toast.error('Erro ao exportar templates');
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Templates de Serviço</h1>
          <p className="text-gray-600 mt-1">
            Gerencie os modelos reutilizáveis dos seus serviços
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowImportModal(true)}
            className="flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            <SelectItem value="gestao_financeira">Gestão Financeira</SelectItem>
            <SelectItem value="consultoria_tributaria">Consultoria Tributária</SelectItem>
            <SelectItem value="valuation">Valuation</SelectItem>
            <SelectItem value="planejamento_financeiro">Planejamento Financeiro</SelectItem>
            <SelectItem value="fusao_aquisicao">Fusão & Aquisição</SelectItem>
            <SelectItem value="reestruturacao">Reestruturação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge variant="outline" className="mt-1">
                    {template.category?.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCloneTemplate(template)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                {template.description || 'Sem descrição'}
              </p>
              <div className="mt-4 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {template.deliverables?.length || 0} entregáveis
                </div>
                <Badge variant={template.is_active ? "default" : "secondary"}>
                  {template.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum template encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || categoryFilter !== 'all' 
              ? 'Tente ajustar os filtros de busca'
              : 'Crie seu primeiro template para começar'
            }
          </p>
          {!searchTerm && categoryFilter === 'all' && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Template
            </Button>
          )}
        </div>
      )}

      {/* Modal do formulário de template */}
      <ServiceTemplateForm
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTemplate(null);
        }}
        onSuccess={() => {
          loadTemplates();
          setShowCreateModal(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
      />

      {/* Modal de importação */}
      <ImportTemplateModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          loadTemplates();
          setShowImportModal(false);
        }}
      />
    </div>
  );
}