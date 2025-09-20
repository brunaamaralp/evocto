
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  FileText, 
  Calendar, 
  Search, 
  Plus, 
  AlertCircle,
  Inbox
} from 'lucide-react';

const icons = {
  users: Users,
  files: FileText,
  calendar: Calendar,
  search: Search,
  inbox: Inbox,
  alert: AlertCircle
};

export default function EmptyState({ 
  icon = "inbox", 
  title, 
  description, 
  action,
  actionLabel,
  className = "" 
}) {
  const IconComponent = icons[icon] || Inbox;

  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <IconComponent className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
      {action && (
        <Button onClick={action}>
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ClientsEmpty({ onCreateClient }) {
  return (
    <EmptyState
      icon="users"
      title="Nenhum cliente ainda"
      description="Comece criando seu primeiro cliente para começar a gerenciar projetos e campanhas."
      action={onCreateClient}
      actionLabel="Criar Primeiro Cliente"
    />
  );
}

export function ProjectsEmpty({ onCreateProject }) {
  return (
    <EmptyState
      icon="files" 
      title="Nenhum projeto criado"
      description="Projetos ajudam você a organizar briefings, aprovações e entregas para seus clientes."
      action={onCreateProject}
      actionLabel="Criar Primeiro Projeto"
    />
  );
}

export function ServicesEmpty({ onCreateService }) {
  return (
    <EmptyState
      icon="calendar"
      title="Nenhum serviço configurado"
      description="Configure serviços recorrentes para automatizar o planejamento e a execução de campanhas."
      action={onCreateService}
      actionLabel="Configurar Primeiro Serviço"
    />
  );
}

export function SearchEmpty({ query }) {
  return (
    <EmptyState
      icon="search"
      title="Nenhum resultado encontrado"
      description={`Não encontramos nada para "${query}". Tente uma pesquisa diferente ou verifique a ortografia.`}
    />
  );
}

export function LearningsEmpty({ onCreateLearning }) {
  return (
    <EmptyState
      icon="files"
      title="Biblioteca de aprendizados vazia"
      description="Capture insights, resultados e aprendizados dos seus projetos para reutilizar em futuros planejamentos."
      action={onCreateLearning}
      actionLabel="Adicionar Primeiro Aprendizado"
    />
  );
}

export function NotificationsEmpty() {
  return (
    <EmptyState
      icon="inbox"
      title="Nenhuma notificação"
      description="Você está em dia! Não há notificações pendentes no momento."
      className="py-8"
    />
  );
}
