import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Briefcase, 
  Search, 
  ArrowRight,
  ChevronRight,
  Command
} from 'lucide-react';
import { useAppContext } from './ContextProvider';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuickSwitcher({ open, onClose })  {
  const { 
    clients, 
    getProjectsForClient, 
    switchContext,
    currentClient,
    currentProject 
  } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [step, setStep] = useState('clients'); // 'clients' | 'projects'
  const inputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setSelectedClient(null);
      setSelectedIndex(0);
      setStep('clients');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get projects for selected client
  const availableProjects = selectedClient ? getProjectsForClient(selectedClient.id) : [];
  const filteredProjects = availableProjects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Current items to display
  const currentItems = step === 'clients' ? filteredClients : filteredProjects;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, currentItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect();
          break;
        case 'Escape':
          e.preventDefault();
          if (step === 'projects') {
            goBackToClients();
          } else {
            onClose();
          }
          break;
        case 'Backspace':
          if (searchTerm === '' && step === 'projects') {
            e.preventDefault();
            goBackToClients();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentItems, selectedIndex, searchTerm, step]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  const handleSelect = () => {
    if (currentItems.length === 0) return;

    const selectedItem = currentItems[selectedIndex];
    
    if (step === 'clients') {
      setSelectedClient(selectedItem);
      setStep('projects');
      setSearchTerm('');
      setSelectedIndex(0);
    } else {
      // Switch to selected project
      switchContext(selectedClient.id, selectedItem.id);
      onClose();
    }
  };

  const goBackToClients = () => {
    setStep('clients');
    setSelectedClient(null);
    setSearchTerm('');
    setSelectedIndex(0);
  };

  const handleClientClick = (client) => {
    setSelectedClient(client);
    setStep('projects');
    setSearchTerm('');
    setSelectedIndex(0);
  };

  const handleProjectClick = (project) => {
    switchContext(selectedClient.id, project.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Command className="w-5 h-5" />
            Trocar Contexto Rapidamente
            {step === 'projects' && selectedClient && (
              <div className="flex items-center gap-2 ml-4 text-sm text-slate-600">
                <ChevronRight className="w-4 h-4" />
                <span>{selectedClient.name}</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={step === 'clients' ? 'Buscar cliente...' : 'Buscar projeto...'}
              className="pl-10 h-12 text-lg"
            />
          </div>

          {/* Navigation Breadcrumb */}
          {step === 'projects' && (
            <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBackToClients}
                className="p-1 h-auto hover:bg-slate-100"
              >
                Clientes
              </Button>
              <ChevronRight className="w-4 h-4" />
              <span className="font-medium">{selectedClient?.name}</span>
              <ChevronRight className="w-4 h-4" />
              <span>Projetos</span>
            </div>
          )}

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            <AnimatePresence mode="wait">
              {step === 'clients' ? (
                <motion.div
                  key="clients"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-1"
                >
                  {filteredClients.map((client, index) => (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? 'bg-blue-50 border-blue-200 border'
                          : 'hover:bg-slate-50'
                      } ${currentClient?.id === client.id ? 'ring-2 ring-blue-200' : ''}`}
                      onClick={() => handleClientClick(client)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{client.name}</div>
                            {client.company && (
                              <div className="text-sm text-slate-500">{client.company}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentClient?.id === client.id && (
                            <Badge variant="outline" className="text-xs">Atual</Badge>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-1"
                >
                  {filteredProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? 'bg-blue-50 border-blue-200 border'
                          : 'hover:bg-slate-50'
                      } ${currentProject?.id === project.id ? 'ring-2 ring-blue-200' : ''}`}
                      onClick={() => handleProjectClick(project)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{project.title}</div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Badge variant="outline" className="text-xs">
                                {project.status}
                              </Badge>
                              {project.priority && (
                                <span>• {project.priority}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentProject?.id === project.id && (
                            <Badge variant="outline" className="text-xs">Atual</Badge>
                          )}
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {currentItems.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>
                  {step === 'clients' 
                    ? 'Nenhum cliente encontrado' 
                    : 'Nenhum projeto encontrado'
                  }
                </p>
                {searchTerm && (
                  <p className="text-sm mt-1">
                    Tente ajustar sua busca
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 pt-4 border-t text-xs text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>↑↓ navegar</span>
              <span>↵ selecionar</span>
              <span>esc {step === 'projects' ? 'voltar' : 'fechar'}</span>
            </div>
            {step === 'projects' && (
              <span>⌫ voltar para clientes</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}