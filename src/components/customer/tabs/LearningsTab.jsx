
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useT } from '@/components/i18n/I18nProvider';
import { LearningEntry } from '@/api/entities';
import { UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, FileText, Image, BarChart3, MessageCircle, Target,
  Lightbulb, Clock, CheckCircle, AlertCircle, Filter, Search,
  Calendar, TrendingUp, TrendingDown, Award, Zap, Eye,
  Download, Trash2, Edit, Plus, ArrowRight, ChevronDown,
  FileSpreadsheet, File, Brain, Sparkles, History, Users
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

// Configuração das categorias de aprendizados
const LEARNING_CATEGORIES = {
  metric: {
    id: 'metric',
    label: 'Métricas',
    icon: BarChart3,
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    description: 'Dados quantificáveis e KPIs'
  },
  feedback: {
    id: 'feedback',
    label: 'Feedbacks',
    icon: MessageCircle,
    color: 'purple',
    gradient: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    description: 'Comentários e avaliações qualitativas'
  },
  result: {
    id: 'result',
    label: 'Resultados',
    icon: Target,
    color: 'green',
    gradient: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    description: 'Resultados de campanhas e ações'
  },
  tactic: {
    id: 'tactic',
    label: 'Táticas',
    icon: Lightbulb,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    description: 'Estratégias e táticas aplicadas'
  },
  insight: {
    id: 'insight',
    label: 'Insights',
    icon: Sparkles,
    color: 'indigo',
    gradient: 'from-indigo-500 to-purple-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    description: 'Descobertas e percepções valiosas'
  }
};

// Configuração dos tipos de insumo
const INPUT_TYPES = {
  pdf: { label: 'PDF', icon: FileText, color: 'red' },
  image: { label: 'Imagem', icon: Image, color: 'blue' },
  spreadsheet: { label: 'Planilha', icon: FileSpreadsheet, color: 'green' },
  text: { label: 'Texto', icon: File, color: 'gray' }
};

// Componente de status de processamento
const ProcessingStatus = ({ status, confidence }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'processing':
        return { 
          label: 'Processando', 
          icon: Clock, 
          color: 'amber',
          animate: true
        };
      case 'ready':
        return { 
          label: 'Concluído', 
          icon: CheckCircle, 
          color: 'green',
          animate: false
        };
      case 'failed':
        return { 
          label: 'Erro', 
          icon: AlertCircle, 
          color: 'red',
          animate: false
        };
      default:
        return { 
          label: 'Pendente', 
          icon: Clock, 
          color: 'gray',
          animate: false
        };
    }
  };

  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={config.animate ? { rotate: 360 } : {}}
        transition={config.animate ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
      >
        <StatusIcon className={`w-4 h-4 text-${config.color}-600`} />
      </motion.div>
      <span className={`text-sm font-medium text-${config.color}-700`}>
        {config.label}
      </span>
      {confidence && (
        <Badge variant="outline" className="ml-2">
          {confidence}% confiança
        </Badge>
      )}
    </div>
  );
};

// Componente de card de aprendizado na timeline
const LearningTimelineCard = ({ learning, onClick }) => {
  const category = LEARNING_CATEGORIES[learning.category] || LEARNING_CATEGORIES.insight;
  const CategoryIcon = category.icon;
  const inputType = INPUT_TYPES[learning.inputType] || INPUT_TYPES.text;
  const InputIcon = inputType.icon;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('pt-BR', { month: 'short' }),
      year: date.getFullYear()
    };
  };

  const formattedDate = formatDate(learning.created_date);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -4 }}
      className="group cursor-pointer"
      onClick={() => onClick(learning)}
    >
      <div className="flex items-start gap-4">
        {/* Data na timeline */}
        <div className="flex-shrink-0 text-center">
          <div className="text-2xl font-bold text-gray-800">{formattedDate.day}</div>
          <div className="text-xs text-gray-500 uppercase">{formattedDate.month}</div>
          <div className="text-xs text-gray-400">{formattedDate.year}</div>
        </div>

        {/* Linha da timeline */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${category.gradient} border-2 border-white shadow-lg`} />
          <div className="w-0.5 h-16 bg-gray-200 mt-2" />
        </div>

        {/* Card do aprendizado */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-5 group-hover:shadow-lg group-hover:border-blue-300 transition-all duration-300">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${category.gradient} flex items-center justify-center shadow-md`}>
                <CategoryIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                  {learning.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${category.bgColor} ${category.textColor} border-0`}>
                    {category.label}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <InputIcon className="w-3 h-3" />
                    {inputType.label}
                  </div>
                </div>
              </div>
            </div>
            <ProcessingStatus 
              status={learning.status} 
              confidence={learning.confidence_score} 
            />
          </div>

          <p className="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-2">
            {learning.description}
          </p>

          {learning.impact && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-700 font-medium">Impacto: {learning.impact}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Componente de filtros
const LearningFilters = ({ filters, onFiltersChange }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros:</span>
        </div>

        <Select value={filters.category} onValueChange={(value) => onFiltersChange({ ...filters, category: value })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.values(LEARNING_CATEGORIES).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <category.icon className="w-4 h-4" />
                  {category.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.inputType} onValueChange={(value) => onFiltersChange({ ...filters, inputType: value })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo de Insumo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(INPUT_TYPES).map(([key, type]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <type.icon className="w-4 h-4" />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.period} onValueChange={(value) => onFiltersChange({ ...filters, period: value })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mês</SelectItem>
            <SelectItem value="quarter">Último trimestre</SelectItem>
            <SelectItem value="year">Último ano</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar aprendizados..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {(filters.category !== 'all' || filters.inputType !== 'all' || filters.period !== 'all' || filters.search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({ category: 'all', inputType: 'all', period: 'all', search: '' })}
            className="text-gray-500 hover:text-gray-700"
          >
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
};

// Modal de upload de insumo
const UploadInputModal = ({ open, onClose, onUpload, client }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFiles) => {
    const fileList = Array.from(selectedFiles).filter(file => {
      const isValidType = file.type.includes('pdf') || 
                          file.type.includes('image') || 
                          file.type.includes('sheet') || 
                          file.type.includes('text');
      if (!isValidType) {
        toast.error(`Arquivo ${file.name} não é suportado`);
        return false;
      }
      return true;
    });
    setFiles(fileList);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !category) {
      toast.error('Selecione ao menos um arquivo e uma categoria');
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        // Upload do arquivo
        const { file_url } = await UploadFile({ file });
        
        // Determinar tipo de insumo baseado no arquivo
        let inputType = 'text';
        if (file.type.includes('pdf')) inputType = 'pdf';
        else if (file.type.includes('image')) inputType = 'image';
        else if (file.type.includes('sheet')) inputType = 'spreadsheet';

        // Criar entrada de aprendizado pendente
        await LearningEntry.create({
          agencyId: client.agencyId,
          projectId: client.id,
          title: `Análise: ${file.name}`,
          description: description || `Aprendizado extraído de ${file.name}`,
          sourceType: 'auto_upload',
          sourceRef: file_url,
          fileUrl: file_url,
          category: category,
          inputType: inputType,
          status: 'processing',
          confidence_score: 0,
          reviewed: false
        });
      }

      toast.success(`${files.length} arquivo(s) enviado(s) para análise`);
      onUpload();
      onClose();
      setFiles([]);
      setCategory('');
      setDescription('');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload dos arquivos');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-600" />
            Adicionar Novo Insumo
          </DialogTitle>
          <DialogDescription>
            Faça upload de PDFs, imagens, planilhas ou textos para análise automática pela IA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Área de upload */}
          <div
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
              ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <motion.div
              animate={dragActive ? { scale: 1.05 } : { scale: 1 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Arraste arquivos aqui ou clique para selecionar
                </h3>
                <p className="text-gray-600 mb-4">
                  Suporte para PDF, imagens (JPG, PNG), planilhas (XLS, CSV) e documentos de texto
                </p>
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Selecionar Arquivos
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.csv,.txt,.doc,.docx"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>
            </motion.div>
          </div>

          {/* Arquivos selecionados */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Arquivos Selecionados:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {files.map((file, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <FileText className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{file.name}</div>
                      <div className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Configurações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria Esperada
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(LEARNING_CATEGORIES).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="w-4 h-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição (Opcional)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contexto adicional sobre o insumo..."
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || files.length === 0 || !category}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {uploading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar para Análise
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Modal de detalhes do aprendizado
const LearningDetailModal = ({ learning, open, onClose }) => {
  if (!learning) return null;

  const category = LEARNING_CATEGORIES[learning.category] || LEARNING_CATEGORIES.insight;
  const inputType = INPUT_TYPES[learning.inputType] || INPUT_TYPES.text;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${category.gradient} flex items-center justify-center`}>
              <category.icon className="w-5 h-5 text-white" />
            </div>
            {learning.title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <Badge className={`${category.bgColor} ${category.textColor} border-0`}>
              {category.label}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <inputType.icon className="w-4 h-4" />
              {inputType.label}
            </div>
            <div className="text-sm text-gray-500">
              {new Date(learning.created_date).toLocaleDateString('pt-BR')}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status e confiança */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <ProcessingStatus 
              status={learning.status} 
              confidence={learning.confidence_score} 
            />
            {learning.fileUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={learning.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Ver Arquivo Original
                </a>
              </Button>
            )}
          </div>

          {/* Descrição do aprendizado */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Aprendizado Extraído</h3>
            <div className="prose prose-sm max-w-none text-gray-700">
              {learning.description}
            </div>
          </div>

          {/* Detalhes estruturados se disponíveis */}
          {learning.niche && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Nicho/Segmento</h4>
              <p className="text-gray-600">{learning.niche}</p>
            </div>
          )}

          {learning.format && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Formato/Canal</h4>
              <p className="text-gray-600">{learning.format}</p>
            </div>
          )}

          {learning.trigger && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Gatilho</h4>
              <p className="text-gray-600">{learning.trigger}</p>
            </div>
          )}

          {learning.promise && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Promessa/Benefício</h4>
              <p className="text-gray-600">{learning.promise}</p>
            </div>
          )}

          {learning.rationale && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Justificativa</h4>
              <p className="text-gray-600">{learning.rationale}</p>
            </div>
          )}

          {/* Resultados/Métricas se disponíveis */}
          {learning.resultJSON && Object.keys(learning.resultJSON).length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Métricas e Resultados</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(learning.resultJSON, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Tags */}
          {learning.tags && learning.tags.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {learning.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente principal
export default function LearningsTab({ client }) {
  const { agencyId } = useSession();
  const [learnings, setLearnings] = useState([]);
  const [filteredLearnings, setFilteredLearnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedLearning, setSelectedLearning] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    inputType: 'all',
    period: 'all',
    search: ''
  });

  const loadLearnings = useCallback(async () => {
    if (!client?.id || !agencyId) return;

    try {
      setLoading(true);
      const clientLearnings = await LearningEntry.filter({
        agencyId,
        projectId: client.id
      }, '-created_date', 100);

      setLearnings(clientLearnings);
    } catch (error) {
      console.error('Erro ao carregar aprendizados:', error);
      toast.error('Erro ao carregar aprendizados');
    } finally {
      setLoading(false);
    }
  }, [client?.id, agencyId]);

  // Filtrar aprendizados
  useEffect(() => {
    let filtered = [...learnings];

    if (filters.category !== 'all') {
      filtered = filtered.filter(l => l.category === filters.category);
    }

    if (filters.inputType !== 'all') {
      filtered = filtered.filter(l => l.inputType === filters.inputType);
    }

    if (filters.period !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.period) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(l => new Date(l.created_date) >= filterDate);
    }

    if (filters.search) {
      filtered = filtered.filter(l => 
        l.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        l.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredLearnings(filtered);
  }, [learnings, filters]);

  useEffect(() => {
    loadLearnings();
  }, [loadLearnings]);

  // Estatísticas dos aprendizados
  const stats = {
    total: learnings.length,
    processing: learnings.filter(l => l.status === 'processing').length,
    ready: learnings.filter(l => l.status === 'ready').length,
    categories: Object.keys(LEARNING_CATEGORIES).reduce((acc, key) => {
      acc[key] = learnings.filter(l => l.category === key).length;
      return acc;
    }, {})
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-20"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
          />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Carregando Aprendizados</h3>
          <p className="text-gray-600">Analisando histórico de insights...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Aprendizados do Cliente
                    </h1>
                    <p className="text-gray-600 mt-1 text-lg">
                      {client?.company || client?.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Insights extraídos automaticamente de insumos
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                  {/* Estatísticas rápidas */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
                      <div className="text-xs text-gray-500">Prontos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">{stats.processing}</div>
                      <div className="text-xs text-gray-500">Processando</div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Insumo
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Filtros */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <LearningFilters filters={filters} onFiltersChange={setFilters} />
          </motion.div>

          {/* Timeline de Aprendizados */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Timeline de Aprendizados</h2>
                <p className="text-gray-600">Evolução cronológica dos insights extraídos</p>
              </div>
            </div>

            {filteredLearnings.length > 0 ? (
              <div className="space-y-8">
                <AnimatePresence>
                  {filteredLearnings.map((learning, index) => (
                    <LearningTimelineCard
                      key={learning.id}
                      learning={learning}
                      onClick={setSelectedLearning}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lightbulb className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Nenhum aprendizado encontrado
                </h3>
                <p className="text-gray-500 mb-6">
                  {learnings.length === 0 
                    ? 'Adicione insumos para começar a extrair aprendizados automaticamente'
                    : 'Ajuste os filtros para encontrar aprendizados específicos'
                  }
                </p>
                {learnings.length === 0 && (
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeiro Insumo
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Modais */}
        <UploadInputModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={loadLearnings}
          client={client}
        />

        <LearningDetailModal
          learning={selectedLearning}
          open={!!selectedLearning}
          onClose={() => setSelectedLearning(null)}
        />
      </div>
    </TooltipProvider>
  );
}
