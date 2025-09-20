import React, { useState, useEffect } from 'react';
import { LearningEntry, Client } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

import {
  Search,
  SlidersHorizontal,
  Upload,
  Lightbulb,
  Globe,
  User,
  TrendingUp,
  Plus,
  BookCopy,
  FolderClock,
  AlertTriangle,
  X,
  CheckCircle,
  Download
} from 'lucide-react';
import LearningCard from '../components/learnings/LearningCard';
import AutoLearningInputModal from '@/components/learnings/AutoLearningInputModal';
import PromoteToPlaybookModal from '@/components/learnings/PromoteToPlaybookModal';
import LearningManualForm from '@/components/learnings/LearningManualForm';
import { ConfidenceSummary, useConfidenceTracking } from '@/components/ai/ConfidenceIndicator';
import { motion } from 'framer-motion';
import RelationalGuard from '../components/utils/RelationalGuard';
import { useSafeFetcher, useSafeAction } from '../components/hooks/useSafeFetcher';
import { StateRenderer, EmptyState, ErrorAlert } from '../components/shared/StateRenderer';

// Define filter options globally or based on typical data
const FILTER_OPTIONS = {
  tipo: [
    { value: 'oportunidade', label: 'Oportunidade' },
    { value: 'risco', label: 'Risco' },
    { value: 'acao', label: 'Ação' },
    { value: 'padrao', label: 'Padrão' },
    { value: 'insight', label: 'Insight' },
  ],
  origem: [
    { value: 'briefing', label: 'Briefing' },
    { value: 'documento', label: 'Documento' },
    { value: 'reuniao', label: 'Reunião' },
    { value: 'analise', label: 'Análise' },
  ],
  status: [
    { value: 'novo', label: 'Novo' },
    { value: 'revisado', label: 'Validado' },
    { value: 'aplicado', label: 'Aplicado' },
  ],
  confianca: [
    { value: 'alta', label: 'Alta' },
    { value: 'media', label: 'Média' },
    { value: 'baixa', label: 'Baixa' },
  ],
};

const FilterPanel = ({ filters, onFiltersChange, onClearFilters, appliedCount }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (category, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      tipo: 'todos',
      origem: 'todos',
      status: 'todos',
      confianca: 'todos'
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClearFilters();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">Filtros Avançados</h3>
        {appliedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-slate-500">
            <X className="w-4 h-4 mr-1" />
            Limpar ({appliedCount})
          </Button>
        )}
      </div>

      {Object.entries(FILTER_OPTIONS).map(([category, options]) => (
        <div key={category} className="space-y-2">
          <label className="text-sm font-medium text-slate-700 capitalize">
            {category === 'confianca' ? 'Confiança' : category}
          </label>
          <Select
            value={localFilters[category]}
            onValueChange={(value) => handleFilterChange(category, value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      <div className="pt-4 border-t">
        <Button onClick={applyFilters} className="w-full">
          Aplicar Filtros
        </Button>
      </div>
    </div>
  );
};

function AprendizadosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    tipo: 'todos',
    origem: 'todos',
    status: 'todos',
    confianca: 'todos'
  });
  const [showAutoInputModal, setShowAutoInputModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [learningToPromote, setLearningToPromote] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { agency } = useSession();

  // ✅ Usar fetcher seguro
  const {
    data: learnings = [],
    loading,
    error,
    retry,
    refresh,
    isEmpty
  } = useSafeFetcher(
    async () => {
      const agencyId = agency?.id || "agency_demo_01";
      const [learningsData, clientsData] = await Promise.all([
        LearningEntry.filter({ agencyId }, "-created_date"),
        Client.filter({ agencyId })
      ]);
      return { learnings: learningsData || [], clients: clientsData || [] };
    },
    [agency?.id]
  );

  const { loading: actionLoading, executeAction } = useSafeAction();

  const clients = learnings?.clients || [];
  const learningsList = learnings?.learnings || [];
  const { needsReview, lowConfidenceCount } = useConfidenceTracking(learningsList);

  const applyFiltersToLearning = (learning) => {
    if (filters.tipo !== 'todos') {
      const hasTypeTag = learning.tags?.includes(filters.tipo);
      if (!hasTypeTag) return false;
    }

    if (filters.origem !== 'todos' && learning.sourceType !== filters.origem) {
      return false;
    }

    if (filters.status !== 'todos') {
      if (filters.status === 'novo' && learning.reviewed) return false;
      if (filters.status === 'revisado' && !learning.reviewed) return false;
      if (filters.status === 'aplicado' && !learning.tags?.includes('applied_to_briefing') && !learning.tags?.includes('in_current_plan')) return false;
    }

    if (filters.confianca !== 'todos') {
      const score = learning.confidence_score || 0;
      if (filters.confianca === 'alta' && score < 80) return false;
      if (filters.confianca === 'media' && (score < 60 || score >= 80)) return false;
      if (filters.confianca === 'baixa' && score >= 60) return false;
    }

    return true;
  };

  const filteredLearnings = learningsList.filter(learning => {
    let scopeMatch = true;
    if (activeTab === 'cliente') {
      scopeMatch = learning.projectId !== null && !learning.isShared;
    } else if (activeTab === 'agency') {
      scopeMatch = learning.isShared === true;
    }

    const searchMatch = !searchTerm ||
      learning.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      learning.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      learning.niche?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      learning.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const filtersMatch = applyFiltersToLearning(learning);

    return scopeMatch && searchMatch && filtersMatch;
  });

  const handleUploadSuccess = (newOrUpdatedLearning) => {
    refresh();
    setShowAutoInputModal(false);
    toast.success('Aprendizado adicionado/atualizado com sucesso!');
  };

  const handlePromoteClick = (learning) => {
    setLearningToPromote(learning);
    setShowPromoteModal(true);
  };

  const handlePromotionSuccess = () => {
    setShowPromoteModal(false);
    refresh();
    toast.success('Aprendizado promovido com sucesso!');
  };

  const handleReviewLearning = async (learningId, action) => {
    await executeAction(async () => {
      const learning = learningsList.find(l => l.id === learningId);
      if (!learning) throw new Error('Aprendizado não encontrado.');

      if (action === 'validate') {
        await LearningEntry.update(learningId, {
          reviewed: true,
          reviewedBy: 'current_user',
          reviewedAt: new Date().toISOString()
        });
        toast.success('Aprendizado validado com sucesso!');
      } else if (action === 'archive') {
        const updatedTags = [...(learning.tags || []), 'archived'];
        await LearningEntry.update(learningId, {
          reviewed: true,
          tags: updatedTags
        });
        toast.success('Aprendizado arquivado.');
      }
      refresh();
    });
  };

  const [showManualForm, setShowManualForm] = useState(false);

  const handleCreateClick = () => {
    setShowManualForm(true);
  };

  const handleExport = () => {
    toast.info("Funcionalidade de exportação em construção.");
  };

  const appliedFiltersCount = Object.values(filters).filter(value => value !== 'todos').length;

  const stats = {
    total: learningsList.length,
    novos: learningsList.filter(l => !l.reviewed).length,
    aplicados: learningsList.filter(l => l.reviewed).length,
    compartilhados: learningsList.filter(l => l.isShared).length,
    needsReview: lowConfidenceCount,
    clienteCount: learningsList.filter(l => !l.isShared && l.projectId).length,
    agencyCount: learningsList.filter(l => l.isShared).length
  };

  return (
    <RelationalGuard entityType="library">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Aprendizados
            </h1>
            <p className="text-slate-600 mt-1">
              O playbook vivo da agência — traga para cá o que funcionou e mova a estratégia.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAutoInputModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Analisar Documento
            </Button>
            <Button onClick={handleExport} disabled={actionLoading || filteredLearnings.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              {actionLoading ? 'Exportando...' : 'Exportar CSV'}
            </Button>
            <Button onClick={handleCreateClick} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Aprendizado
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-white border-slate-200/60 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BookCopy className="w-6 h-6 text-purple-600" />
                  <div>
                    <div className="text-xl font-bold text-slate-900">{stats.total}</div>
                    <div className="text-xs text-slate-500">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Outros cards de estatísticas omitidos para brevidade... */}
        </div>

        <StateRenderer
          loading={loading}
          error={error}
          isEmpty={isEmpty}
          onRetry={retry}
          loadingMessage="Carregando biblioteca de aprendizados..."
          emptyState={
            <EmptyState
              icon={Lightbulb}
              title="Sem aprendizados cadastrados"
              description="Traga para cá o que funcionou — esse playbook move a agência."
              action={
                <Button
                  onClick={() => setShowAutoInputModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Aprendizado
                </Button>
              }
            />
          }
        >
          {/* Search and Filters */}
          <Card className="shadow-sm border-slate-200/60">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por formato, canal, gatilho ou insight..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-50/50"
                  />
                </div>

                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="shrink-0 w-full lg:w-auto border-purple-300 text-purple-700 hover:bg-purple-50">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Filtros
                      {appliedFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-purple-100 text-purple-700">
                          {appliedFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Filtros de Aprendizados</SheetTitle>
                      <SheetDescription>
                        Refine sua busca por tipo, origem, status e confiança.
                      </SheetDescription>
                    </SheetHeader>
                    <FilterPanel
                      filters={filters}
                      onFiltersChange={(newFilters) => { setFilters(newFilters); setFiltersOpen(false); }}
                      onClearFilters={() => setFiltersOpen(false)}
                      appliedCount={appliedFiltersCount}
                    />
                  </SheetContent>
                </Sheet>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {filteredLearnings.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLearnings.map((learning) => {
                const customer = clients.find(c => c.name === learning.projectId);
                return (
                  <LearningCard
                    key={learning.id}
                    learning={learning}
                    clientName={learning.projectId ? customer?.name : 'Global'}
                    showGlobalActions={learning.isShared}
                    onUpdate={refresh}
                    onPromote={handlePromoteClick}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="Nenhum resultado encontrado"
              description="Tente ajustar os filtros ou termos de busca."
            />
          )}
        </StateRenderer>

        {/* Modals */}
        {showAutoInputModal && (
          <AutoLearningInputModal
            onClose={() => setShowAutoInputModal(false)}
            onSuccess={handleUploadSuccess}
          />
        )}
        {showManualForm && (
          <LearningManualForm
            isOpen={showManualForm}
            onClose={() => setShowManualForm(false)}
            onSuccess={handleUploadSuccess}
          />
        )}
        {showPromoteModal && (
          <PromoteToPlaybookModal
            learning={learningToPromote}
            onClose={() => setShowPromoteModal(false)}
            onSuccess={handlePromotionSuccess}
          />
        )}
      </div>
    </RelationalGuard>
  );
}

// ✅ Export default correto
export default AprendizadosPage;