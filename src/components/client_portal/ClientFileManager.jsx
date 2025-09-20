import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Edit, 
  Search, 
  Filter, 
  Folder, 
  FileText, 
  Image, 
  File,
  Plus,
  Calendar,
  User,
  HardDrive,
  BarChart3
} from 'lucide-react';
import { useClientFileManagement } from '@/hooks/useClientFileManagement';
import FileUploadModal from './FileUploadModal';
import FileDetailsModal from './FileDetailsModal';

/**
 * Componente principal de gestão de arquivos do cliente
 */
export default function ClientFileManager({ clientId, serviceId = null }) {
  const {
    files,
    loading,
    error,
    uploading,
    loadFiles,
    deleteFile,
    downloadFile,
    filterFilesByCategory,
    searchFiles,
    getFileStats
  } = useClientFileManagement();

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid, list

  useEffect(() => {
    if (clientId) {
      loadFiles(clientId, serviceId);
    }
  }, [clientId, serviceId, loadFiles]);

  const fileStats = getFileStats();
  const filteredFiles = filterFilesByCategory(activeTab);
  const searchedFiles = searchFiles(searchTerm);
  const displayFiles = searchTerm ? searchedFiles : filteredFiles;

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileText;
    return File;
  };

  const getFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'diagnostic': return BarChart3;
      case 'report': return FileText;
      case 'deliverable': return Folder;
      case 'contract': return FileText;
      case 'presentation': return FileText;
      case 'analysis': return BarChart3;
      default: return File;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'diagnostic': return 'bg-blue-100 text-blue-700';
      case 'report': return 'bg-green-100 text-green-700';
      case 'deliverable': return 'bg-purple-100 text-purple-700';
      case 'contract': return 'bg-orange-100 text-orange-700';
      case 'presentation': return 'bg-indigo-100 text-indigo-700';
      case 'analysis': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'diagnostic': return 'Diagnóstico';
      case 'report': return 'Relatórios';
      case 'deliverable': return 'Entregáveis';
      case 'contract': return 'Contratos';
      case 'presentation': return 'Apresentações';
      case 'analysis': return 'Análises';
      default: return 'Outros';
    }
  };

  const handleFileClick = (file) => {
    setSelectedFile(file);
    setShowDetailsModal(true);
  };

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Tem certeza que deseja remover este arquivo?')) {
      try {
        await deleteFile(fileId);
      } catch (error) {
        // Erro já tratado no hook
      }
    }
  };

  const categories = [
    { id: 'all', label: 'Todos', count: files.length },
    { id: 'diagnostic', label: 'Diagnósticos', count: files.filter(f => f.category === 'diagnostic').length },
    { id: 'report', label: 'Relatórios', count: files.filter(f => f.category === 'report').length },
    { id: 'deliverable', label: 'Entregáveis', count: files.filter(f => f.category === 'deliverable').length },
    { id: 'contract', label: 'Contratos', count: files.filter(f => f.category === 'contract').length },
    { id: 'presentation', label: 'Apresentações', count: files.filter(f => f.category === 'presentation').length },
    { id: 'analysis', label: 'Análises', count: files.filter(f => f.category === 'analysis').length },
    { id: 'other', label: 'Outros', count: files.filter(f => f.category === 'other').length }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Arquivos</h2>
          <p className="text-gray-600">Organize e gerencie seus documentos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Enviar Arquivo
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{fileStats.total}</div>
              <div className="text-sm text-gray-600">Total de Arquivos</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{getFileSize(fileStats.totalSize)}</div>
              <div className="text-sm text-gray-600">Espaço Usado</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Folder className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{fileStats.categories}</div>
              <div className="text-sm text-gray-600">Categorias</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{fileStats.recentUploads}</div>
              <div className="text-sm text-gray-600">Enviados Esta Semana</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar arquivos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <div className="grid grid-cols-2 gap-1 w-4 h-4">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <div className="flex flex-col gap-1 w-4 h-4">
                  <div className="bg-current rounded-sm h-1"></div>
                  <div className="bg-current rounded-sm h-1"></div>
                  <div className="bg-current rounded-sm h-1"></div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categorias */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          {categories.map(category => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              {React.createElement(getCategoryIcon(category.id), { className: "w-4 h-4" })}
              <span className="hidden sm:inline">{category.label}</span>
              <Badge variant="outline" className="text-xs">{category.count}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {displayFiles.length === 0 ? (
            <Card className="border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Nenhum arquivo encontrado' : 'Nenhum arquivo nesta categoria'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? 'Tente ajustar os termos de busca'
                    : 'Envie seu primeiro arquivo para começar'
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Primeiro Arquivo
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-4'
            }>
              {displayFiles.map((file, index) => {
                const FileIcon = getFileIcon(file.fileType);
                const CategoryIcon = getCategoryIcon(file.category);
                
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleFileClick(file)}>
                      <CardContent className="p-4">
                        {viewMode === 'grid' ? (
                          // Vista em Grid
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FileIcon className="w-5 h-5 text-gray-600" />
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadFile(file.id);
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(file.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-gray-900 truncate" title={file.fileName}>
                                {file.fileName}
                              </h4>
                              <p className="text-sm text-gray-600 truncate">
                                {file.description || 'Sem descrição'}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Badge className={getCategoryColor(file.category)}>
                                <CategoryIcon className="w-3 h-3 mr-1" />
                                {getCategoryLabel(file.category)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {getFileSize(file.fileSize)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(file.uploadedAt).toLocaleDateString('pt-BR')}
                              <User className="w-3 h-3 ml-2" />
                              {file.uploadedBy}
                            </div>
                          </div>
                        ) : (
                          // Vista em Lista
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <FileIcon className="w-5 h-5 text-gray-600" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">
                                {file.fileName}
                              </h4>
                              <p className="text-sm text-gray-600 truncate">
                                {file.description || 'Sem descrição'}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                <span>{getFileSize(file.fileSize)}</span>
                                <span>{new Date(file.uploadedAt).toLocaleDateString('pt-BR')}</span>
                                <span>{file.uploadedBy}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge className={getCategoryColor(file.category)}>
                                <CategoryIcon className="w-3 h-3 mr-1" />
                                {getCategoryLabel(file.category)}
                              </Badge>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadFile(file.id);
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFile(file.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showUploadModal && (
        <FileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          clientId={clientId}
          serviceId={serviceId}
          onSuccess={() => {
            setShowUploadModal(false);
            loadFiles(clientId, serviceId);
          }}
        />
      )}

      {showDetailsModal && selectedFile && (
        <FileDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          file={selectedFile}
          onDownload={() => downloadFile(selectedFile.id)}
          onDelete={() => {
            handleDeleteFile(selectedFile.id);
            setShowDetailsModal(false);
          }}
        />
      )}
    </div>
  );
}

