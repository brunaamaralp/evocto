import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Search,
  FileText,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceTemplateWizard from '@/components/services/ServiceTemplateWizard';
import { useDebounce } from '@/components/hooks/useDebounce';
import { ensureCicloMensalTemplate } from '@/api/functions/ensureCicloMensalTemplate';
import { ensureItemCycleTemplates } from '@/api/functions/ensureItemCycleTemplates';
import { toast } from 'sonner';

const STATUS_FILTERS = {
  active: 'active',
  inactive: 'inactive',
  all: 'all',
};

function isTemplateRow(service) {
  return service?.is_template === true || service?.is_template === 'true' || service?.is_template === 1;
}

function isActiveTemplate(service) {
  return service?.is_active !== false && service?.is_active !== 'false' && service?.is_active !== 0;
}

export default function ServicesPage() {
  const { agencyId } = useSession();
  const [templates, setTemplates] = useState([]);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTERS.active);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadTemplates = useCallback(async () => {
    if (!agencyId) return;

    setLoading(true);
    setError('');

    try {
      let seeded = null;
      let itemSeeded = {};
      try {
        [seeded, itemSeeded] = await Promise.all([
          ensureCicloMensalTemplate(agencyId),
          ensureItemCycleTemplates(agencyId),
        ]);
      } catch (seedErr) {
        console.warn('Falha ao garantir templates padrão:', seedErr);
        toast.error(seedErr?.message || 'Não foi possível instalar o template padrão');
      }

      let templatesData = await Service.filter(
        { agencyId, is_template: true },
        '-updated_date',
        100
      );

      if (!Array.isArray(templatesData) || templatesData.length === 0) {
        const all = await Service.filter({ agencyId }, '-updated_date', 100);
        templatesData = (Array.isArray(all) ? all : []).filter(isTemplateRow);
      }

      for (const extra of [seeded, ...Object.values(itemSeeded || {})]) {
        if (extra?.id && !(templatesData || []).some((t) => t.id === extra.id)) {
          templatesData = [extra, ...(templatesData || [])];
        }
      }

      setTemplates(Array.isArray(templatesData) ? templatesData : []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      setError(`Erro ao carregar templates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    if (agencyId) loadTemplates();
  }, [agencyId, loadTemplates]);

  const handleServiceUpdate = useCallback((updatedService) => {
    if (!updatedService?.id || !isTemplateRow(updatedService)) return;

    setTemplates((prev) => {
      const index = prev.findIndex((s) => s.id === updatedService.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = updatedService;
        return next;
      }
      return [...prev, updatedService];
    });
  }, []);

  const handleToggleActive = useCallback(async (template) => {
    const nextActive = !isActiveTemplate(template);
    try {
      const updated = await Service.update(template.id, { is_active: nextActive });
      const merged = { ...template, ...(updated || {}), is_active: nextActive };
      handleServiceUpdate(merged);
      toast.success(nextActive ? 'Template ativado' : 'Template desativado');
    } catch (err) {
      console.error('Erro ao alterar status do template:', err);
      toast.error(err?.message || 'Não foi possível alterar o status');
    }
  }, [handleServiceUpdate]);

  const handleCreateSuccess = useCallback(() => {
    setShowTemplateForm(false);
    loadTemplates();
  }, [loadTemplates]);

  const counts = React.useMemo(() => {
    const active = templates.filter(isActiveTemplate).length;
    return {
      active,
      inactive: templates.length - active,
      all: templates.length,
    };
  }, [templates]);

  const filteredTemplates = React.useMemo(() => {
    const searchLower = debouncedSearchTerm.toLowerCase();
    return templates.filter((template) => {
      const matchesStatus =
        statusFilter === STATUS_FILTERS.all ||
        (statusFilter === STATUS_FILTERS.active && isActiveTemplate(template)) ||
        (statusFilter === STATUS_FILTERS.inactive && !isActiveTemplate(template));

      const matchesSearch =
        !debouncedSearchTerm ||
        template.name?.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower) ||
        template.category?.toLowerCase().includes(searchLower);

      return matchesStatus && matchesSearch;
    });
  }, [templates, debouncedSearchTerm, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#18162A]">Templates de Serviço</h1>
          <p className="text-[#7A7595] mt-1">
            Escolha quais modelos a agência usa ou crie um novo. Serviços por cliente ficam no hub do cliente.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadTemplates} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => setShowTemplateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value={STATUS_FILTERS.active} className="gap-2">
              Ativos
              <Badge variant="secondary">{counts.active}</Badge>
            </TabsTrigger>
            <TabsTrigger value={STATUS_FILTERS.inactive} className="gap-2">
              Inativos
              <Badge variant="secondary">{counts.inactive}</Badge>
            </TabsTrigger>
            <TabsTrigger value={STATUS_FILTERS.all} className="gap-2">
              Todos
              <Badge variant="secondary">{counts.all}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <ServicesLoadingSkeleton count={6} />
      ) : filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <ServiceCard
              key={template.id}
              service={template}
              onServiceUpdate={handleServiceUpdate}
              onToggleActive={handleToggleActive}
              showKPICount
              catalogMode
            />
          ))}
        </div>
      ) : (
        <EmptyTemplatesState
          statusFilter={statusFilter}
          hasSearchTerm={!!debouncedSearchTerm}
          onCreateTemplate={() => setShowTemplateForm(true)}
          onRefresh={loadTemplates}
        />
      )}

      {showTemplateForm && (
        <ServiceTemplateWizard
          isOpen={showTemplateForm}
          onClose={() => setShowTemplateForm(false)}
          onTemplateCreated={handleCreateSuccess}
        />
      )}
    </div>
  );
}

function ServicesLoadingSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-6 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyTemplatesState({ statusFilter, hasSearchTerm, onCreateTemplate, onRefresh }) {
  if (hasSearchTerm) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum resultado encontrado
          </h3>
          <p className="text-gray-600">Tente ajustar os termos de busca</p>
        </CardContent>
      </Card>
    );
  }

  if (statusFilter === STATUS_FILTERS.inactive) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum template inativo
          </h3>
          <p className="text-gray-600">
            Templates desativados aparecem aqui e deixam de ser oferecidos aos clientes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nenhum template encontrado
        </h3>
        <p className="text-gray-600 mb-4">
          O template padrão <strong>Ciclo Mensal de Campanhas</strong> e os operacionais devem
          instalar ao abrir esta página. Se a lista continuar vazia, reinstale abaixo.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Instalar template padrão
          </Button>
          <Button onClick={onCreateTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            Criar template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
