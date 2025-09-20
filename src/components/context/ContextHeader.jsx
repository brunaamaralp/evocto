import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  FolderOpen, 
  FileText, 
  Search, 
  Command, 
  X,
  ChevronDown,
  Building,
  Briefcase
} from 'lucide-react';
import { useAppContext } from './ContextProvider';
import { motion, AnimatePresence } from 'framer-motion';
import QuickSwitcher from './QuickSwitcher';

export default function ContextHeader() {
  const {
    currentClient,
    currentProject,
    clients,
    projects,
    getProjectsForClient,
    switchContext,
    clearContext,
    hasValidContext,
    isContextRequired,
    contextLoading
  } = useAppContext();

  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // Keyboard shortcut for Quick Switcher
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickSwitcher(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.company.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const availableProjects = currentClient ? getProjectsForClient(currentClient.id) : [];
  const filteredProjects = availableProjects.filter(project =>
    project.title.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const clientProjects = getProjectsForClient(clientId);
      if (clientProjects.length > 0) {
        // Auto-select first project for this client
        switchContext(clientId, clientProjects[0].id);
      }
    }
    setClientSearch('');
  };

  const handleProjectChange = (projectId) => {
    if (currentClient) {
      switchContext(currentClient.id, projectId);
    }
    setProjectSearch('');
  };

  // Empty state when no context is required
  if (!isContextRequired && !hasValidContext) {
    return (
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-600">
            <FolderOpen className="w-5 h-5" />
            <span className="text-sm font-medium">Navegação Global</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuickSwitcher(true)}
            className="text-slate-600 hover:text-slate-900"
          >
            <Command className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">Selecionar Contexto</span>
            <span className="md:hidden">Contexto</span>
            <kbd className="hidden md:inline-flex ml-2 px-1.5 py-0.5 text-xs bg-slate-100 rounded">
              ⌘K
            </kbd>
          </Button>
        </div>
      </div>
    );
  }

  // Context required but missing
  if (isContextRequired && !hasValidContext) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-amber-200 bg-white p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Selecione um contexto</h3>
                  <p className="text-sm text-slate-600">
                    Escolha um cliente e projeto para continuar
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowQuickSwitcher(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Search className="w-4 h-4 mr-2" />
                Selecionar Cliente & Projeto
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Active context header
  return (
    <>
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Current Context Display */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
              {/* Client Selector */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium whitespace-nowrap">Cliente:</span>
                </div>
                <Select 
                  value={currentClient?.id || ''} 
                  onValueChange={handleClientChange}
                  disabled={contextLoading}
                >
                  <SelectTrigger className="min-w-[200px] max-w-[300px] h-8 text-sm">
                    <SelectValue placeholder="Selecionar cliente">
                      {currentClient && (
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium truncate">{currentClient.name}</span>
                          {currentClient.company && (
                            <span className="text-slate-500 text-xs truncate">
                              • {currentClient.company}
                            </span>
                          )}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-w-[400px]">
                    <div className="p-2">
                      <Input
                        placeholder="Buscar cliente..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    {filteredClients.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="max-w-[380px]">
                        <div className="flex items-center gap-2 truncate">
                          <Building className="w-4 h-4 flex-shrink-0 text-slate-400" />
                          <div className="truncate">
                            <div className="font-medium truncate">{client.name}</div>
                            {client.company && (
                              <div className="text-xs text-slate-500 truncate">{client.company}</div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    {filteredClients.length === 0 && (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        Nenhum cliente encontrado
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Selector */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium whitespace-nowrap">Projeto:</span>
                </div>
                <Select 
                  value={currentProject?.id || ''} 
                  onValueChange={handleProjectChange}
                  disabled={!currentClient || contextLoading}
                >
                  <SelectTrigger className="min-w-[200px] max-w-[300px] h-8 text-sm">
                    <SelectValue placeholder="Selecionar projeto">
                      {currentProject && (
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium truncate">{currentProject.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {currentProject.status}
                          </Badge>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-w-[400px]">
                    <div className="p-2">
                      <Input
                        placeholder="Buscar projeto..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    {filteredProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="max-w-[380px]">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 flex-shrink-0 text-slate-400" />
                          <div className="truncate">
                            <div className="font-medium truncate">{project.title}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Badge variant="outline" className="text-xs">
                                {project.status}
                              </Badge>
                              {project.priority && (
                                <span>• {project.priority}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    {filteredProjects.length === 0 && (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        {currentClient ? 'Nenhum projeto encontrado' : 'Selecione um cliente primeiro'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQuickSwitcher(true)}
                className="text-slate-600 hover:text-slate-900"
              >
                <Command className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Trocar Rapidamente</span>
                <span className="md:hidden">Trocar</span>
                <kbd className="hidden md:inline-flex ml-2 px-1.5 py-0.5 text-xs bg-slate-100 rounded">
                  ⌘K
                </kbd>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearContext('user_action')}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
                <span className="hidden md:inline ml-2">Limpar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Switcher Modal */}
      <QuickSwitcher 
        open={showQuickSwitcher}
        onClose={() => setShowQuickSwitcher(false)}
      />
    </>
  );
}