
import React, { useState, useEffect } from 'react';
import { SupportLibrary as SupportLibraryEntity } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, Play, FileText, CheckSquare, Video, Download,
  Search, Filter, Star, Clock, Users, Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingState from '@/components/shared/LoadingStates';
import EmptyState from '@/components/shared/EmptyState';

export default function SupportLibrary({ agencyId, targetAudience = ['client'] }) {
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        setLoading(true);
        const materialsData = await SupportLibraryEntity.filter({
          $or: [
            { agencyId, is_active: true },
            { is_public: true, is_active: true }
          ],
          target_audience: { $in: targetAudience }
        }, '-usage_count');

        setMaterials(materialsData);
      } catch (error) {
        console.error('Erro ao carregar biblioteca:', error);
        toast.error('Erro ao carregar materiais de apoio');
      } finally {
        setLoading(false);
      }
    };

    if (agencyId) {
      loadMaterials();
    }
  }, [agencyId, targetAudience]);

  useEffect(() => {
    const filterMaterials = () => {
      let filtered = materials;

      // Filtro por busca
      if (searchTerm) {
        filtered = filtered.filter(material =>
          material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          material.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      // Filtro por categoria
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(material => material.category === selectedCategory);
      }

      // Filtro por tipo
      if (selectedType !== 'all') {
        filtered = filtered.filter(material => material.type === selectedType);
      }

      setFilteredMaterials(filtered);
    };

    filterMaterials();
  }, [materials, searchTerm, selectedCategory, selectedType]);

  const handleMaterialClick = async (material) => {
    try {
      // Incrementar contador de uso
      await SupportLibraryEntity.update(material.id, {
        usage_count: (material.usage_count || 0) + 1
      });

      // Abrir material baseado no tipo
      if (material.content?.external_link) {
        window.open(material.content.external_link, '_blank');
      } else if (material.content?.file_url) {
        window.open(material.content.file_url, '_blank');
      } else if (material.content?.video_url) {
        window.open(material.content.video_url, '_blank');
      }

      // Atualizar contador local
      setMaterials(prev => prev.map(m => 
        m.id === material.id 
          ? { ...m, usage_count: (m.usage_count || 0) + 1 }
          : m
      ));
    } catch (error) {
      console.error('Erro ao acessar material:', error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'training': return BookOpen;
      case 'guide': return FileText;
      case 'checklist': return CheckSquare;
      case 'template': return FileText;
      case 'video': return Video;
      case 'document': return FileText;
      default: return BookOpen;
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      communication_basics: 'Fundamentos de Comunicação',
      content_social: 'Conteúdo & Social',
      media_performance: 'Mídia & Performance',
      brand_positioning: 'Marca & Posicionamento',
      reporting: 'Relatórios',
      software_training: 'Treinamento de Ferramentas',
      client_communication: 'Comunicação com Cliente',
      // legacy keys
      financial_basics: 'Fundamentos de Comunicação',
      kpi_management: 'Métricas & Performance',
      cash_flow: 'Mídia & Performance',
      tax_compliance: 'Marca & Posicionamento'
    };
    return labels[category] || category;
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <LoadingState message="Carregando biblioteca de apoio..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header e Filtros */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Biblioteca de Apoio
            </h3>
            <p className="text-sm text-gray-600">
              Materiais de treinamento e apoio para serviços de comunicação e marketing
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredMaterials.length} de {materials.length} materiais
          </div>
        </div>

        {/* Barra de busca e filtros */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar materiais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todas as categorias</option>
            <option value="communication_basics">Fundamentos de Comunicação</option>
            <option value="content_social">Conteúdo & Social</option>
            <option value="media_performance">Mídia & Performance</option>
            <option value="brand_positioning">Marca & Posicionamento</option>
            <option value="reporting">Relatórios</option>
            <option value="software_training">Treinamento</option>
            <option value="client_communication">Comunicação</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todos os tipos</option>
            <option value="training">Treinamento</option>
            <option value="guide">Guia</option>
            <option value="checklist">Checklist</option>
            <option value="template">Template</option>
            <option value="video">Vídeo</option>
            <option value="document">Documento</option>
          </select>
        </div>
      </div>

      {/* Lista de Materiais */}
      {filteredMaterials.length > 0 ? (
        <div className="grid gap-4">
          {filteredMaterials.map((material) => {
            const TypeIcon = getTypeIcon(material.type);
            
            return (
              <Card 
                key={material.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleMaterialClick(material)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 truncate pr-2">
                          {material.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {material.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm text-gray-600">
                                {material.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(material.category)}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {material.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {material.estimated_duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{material.estimated_duration} min</span>
                            </div>
                          )}
                          
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getDifficultyColor(material.difficulty_level)}`}
                          >
                            {material.difficulty_level === 'beginner' && 'Iniciante'}
                            {material.difficulty_level === 'intermediate' && 'Intermediário'}
                            {material.difficulty_level === 'advanced' && 'Avançado'}
                          </Badge>
                          
                          {material.usage_count > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{material.usage_count} visualizações</span>
                            </div>
                          )}
                        </div>
                        
                        {material.tags && material.tags.length > 0 && (
                          <div className="flex gap-1">
                            {material.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="pasta"
          title="Nenhum material encontrado"
          description="Não foram encontrados materiais com os filtros aplicados"
          primaryAction={{
            label: 'Limpar Filtros',
            onClick: () => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedType('all');
            }
          }}
        />
      )}
    </div>
  );
}
