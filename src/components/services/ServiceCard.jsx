
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  User, Target, Clock, BarChart3, FileText, // New icons for service stats
  Edit, Copy, Trash2, MoreHorizontal, // Updated icons for dropdown
  Eye, CheckSquare // New icons for navigation buttons
} from 'lucide-react';
import {
  Button
} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

// Assume ServiceModal exists for creating instances
import ServiceModal from './ServiceModal'; // Adjust path as necessary for your project structure

// Constant for service status labels
const SERVICE_STATUS_LABELS = {
  active: 'Ativo',
  in_execution: 'Em Execução',
  completed: 'Concluído',
  paused: 'Pausado',
  cancelled: 'Cancelado',
  archived: 'Arquivado',
};

export default function ServiceCard({
  service,
  clients = [],
  onServiceUpdate,
  showKPICount = false,
  showInheritedInfo = false,
  // New props for navigation functionality
  navigate, // Function to handle navigation (e.g., from useNavigate hook)
  createPageUrl // Utility function to construct page URLs
}) {
  const [showInstanceModal, setShowInstanceModal] = useState(false);

  const isTemplate = service.is_template;
  const client = service.clientId ? clients.find(c => c.id === service.clientId) : null;
  const clientId = service.clientId; // Extract clientId for use in navigation URLs

  // Placeholder functions for actions. In a real app, these would trigger modals/navigation.
  const handleEdit = () => {
    console.log(`Editing service: ${service.id}`);
    // Example: Trigger an edit modal or navigate
    // onEdit(service);
  };

  const handleDelete = () => {
    console.log(`Deleting service: ${service.id}`);
    // Example: Trigger a confirmation dialog
    // onDelete(service.id);
  };

  // New navigation functions
  const handleViewDetails = () => {
    if (navigate && createPageUrl) {
      navigate(`${createPageUrl('service-detail')}?serviceId=${service.id}${clientId ? `&clientId=${clientId}` : ''}`);
    } else {
      console.warn("ServiceCard: 'navigate' or 'createPageUrl' prop not provided. Cannot view details.");
    }
  };

  const handleManageTasks = () => {
    if (navigate && createPageUrl) {
      navigate(`${createPageUrl('client-tasks')}?serviceId=${service.id}${clientId ? `&clientId=${clientId}` : ''}`);
    } else {
      console.warn("ServiceCard: 'navigate' or 'createPageUrl' prop not provided. Cannot manage tasks.");
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${
      isTemplate ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'
    } flex flex-col h-full`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isTemplate ? (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  Template
                </Badge>
              ) : (
                <Badge variant="outline">
                  Instância
                </Badge>
              )}
              {service.template_category && (
                <Badge variant="outline" className="capitalize">
                  {service.template_category}
                </Badge>
              )}
              {!service.is_active && ( // Keeping is_active badge if it exists
                <Badge variant="destructive" className="text-xs">
                  Inativo
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{service.name}</CardTitle>
            {client && (
              <p className="text-sm text-gray-600">
                <User className="w-4 h-4 inline mr-1" />
                {client.name}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                {isTemplate ? 'Editar Template' : 'Editar Serviço'}
              </DropdownMenuItem>
              {isTemplate && (
                <DropdownMenuItem onClick={() => setShowInstanceModal(true)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Criar Instância
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-grow flex flex-col justify-between">
        {service.description && (
          <p className="text-gray-600 text-sm line-clamp-2">
            {service.description}
          </p>
        )}

        {/* Service Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-gray-600">
              {service.deliverables?.length || 0} entregáveis
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-green-500" />
            <span className="text-gray-600">
              {service.deliverables?.reduce((acc, d) => acc + (d.estimated_hours || 0), 0) || 0}h
            </span>
          </div>

          {/* P0: Mostrar KPIs herdados */}
          {showKPICount && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span className="text-gray-600">
                {service.default_kpis?.length || 0} KPIs padrão
              </span>
            </div>
          )}

          {/* P0: Info de herança para instâncias */}
          {showInheritedInfo && service.base_service_id && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span className="text-gray-600 text-xs">
                Herdado do template • v{service.template_version_used}
              </span>
            </div>
          )}
        </div>

        {/* Pricing */}
        {service.pricing && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-gray-600">
              {service.pricing.type === 'fixed' ? 'Preço fixo' :
                service.pricing.type === 'hourly' ? 'Por hora' :
                  service.pricing.type === 'retainer' ? 'Retainer' : 'Taxa sucesso'}
            </span>
            <span className="font-semibold text-green-600">
              R$ {service.pricing.base_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Template usage stats */}
        {isTemplate && service.template_metadata && (
          <div className="flex items-center gap-4 pt-2 border-t text-xs text-gray-500">
            <span>Usado {service.template_metadata.usage_count || 0}x</span>
            {service.template_metadata.last_used && (
              <span>
                Último uso: {new Date(service.template_metadata.last_used).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        )}

        {/* Instance status */}
        {!isTemplate && service.service_status && (
          <div className="pt-2 border-t">
            <Badge
              variant={
                service.service_status === 'completed' ? 'default' :
                  service.service_status === 'in_execution' ? 'secondary' :
                    'outline'
              }
              className="w-full justify-center"
            >
              {SERVICE_STATUS_LABELS[service.service_status] || service.service_status}
            </Badge>
          </div>
        )}

        {/* Action Buttons for Navigation */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewDetails}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            Detalhes
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManageTasks}
            className="flex-1"
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            Tarefas
          </Button>
        </div>
      </CardContent>

      {/* Instance Creation Modal */}
      {showInstanceModal && (
        <ServiceModal
          isOpen={showInstanceModal}
          onClose={() => setShowInstanceModal(false)}
          onServiceCreated={onServiceUpdate}
          clients={clients}
          selectedTemplate={service}
          mode="instance"
        />
      )}
    </Card>
  );
}
