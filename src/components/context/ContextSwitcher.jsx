import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  Building,
  User,
  FolderOpen,
  Search,
  ChevronRight,
  X
} from 'lucide-react';
import { useAppContext } from './ContextProvider';
import { motion, AnimatePresence } from 'framer-motion';

export default function ContextSwitcher() {
  const {
    currentClient,
    currentProject,
    clients,
    projects,
    switchClientContext,
    switchProjectContext,
    clearContext,
    contextLoading,
    getProjectsForClient
  } = useAppContext();

  const [clientSearch, setClientSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.company.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const availableProjects = currentClient ? getProjectsForClient(currentClient.id) : [];
  const filteredProjects = availableProjects.filter(project =>
    project.title.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleClientChange = (clientId) => {
    switchClientContext(clientId);
    setClientSearch('');
  };

  const handleProjectChange = (projectId) => {
    if (currentClient) {
      switchProjectContext(projectId);
    }
    setProjectSearch('');
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Breadcrumb Context Display */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Building className="w-4 h-4" />
              <span className="font-medium bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                evolvIA
              </span>
            </div>

            {currentClient && (
              <>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <Select 
                    value={currentClient?.id || ''} 
                    onValueChange={handleClientChange}
                    disabled={contextLoading}
                  >
                    <SelectTrigger className="h-8 min-w-[200px] max-w-[300px] text-sm border-dashed">
                      <SelectValue>
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium text-slate-900 truncate">{currentClient.name}</span>
                          {currentClient.company && (
                            <span className="text-slate-500 text-xs truncate">
                              • {currentClient.company}
                            </span>
                          )}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-w-[400px]">
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="Buscar cliente..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="h-8 text-sm pl-9"
                          />
                        </div>
                      </div>
                      {filteredClients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="max-w-[380px]">
                          <div className="flex items-center gap-2 truncate">
                            <User className="w-4 h-4 flex-shrink-0 text-slate-400" />
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
              </>
            )}

            {currentProject && (
              <>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-slate-500" />
                  <Select 
                    value={currentProject?.id || ''} 
                    onValueChange={handleProjectChange}
                    disabled={!currentClient || contextLoading}
                  >
                    <SelectTrigger className="h-8 min-w-[200px] max-w-[300px] text-sm border-dashed">
                      <SelectValue>
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium text-slate-900 truncate">{currentProject.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {currentProject.status}
                          </Badge>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-w-[400px]">
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            placeholder="Buscar projeto..."
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="h-8 text-sm pl-9"
                          />
                        </div>
                      </div>
                      {filteredProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id} className="max-w-[380px]">
                          <div className="flex items-center gap-2 truncate">
                            <FolderOpen className="w-4 h-4 flex-shrink-0 text-slate-400" />
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
              </>
            )}
          </div>

          {/* Clear Context Action */}
          {(currentClient || currentProject) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearContext('user_action')}
              className="text-slate-500 hover:text-slate-700 h-8"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar Contexto
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}