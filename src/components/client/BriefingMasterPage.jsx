
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useT } from '@/components/i18n/I18nProvider';
import { Brief } from '@/api/entities';
import { LearningEntry } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Edit, Save, X, Plus, Trash2, Eye, EyeOff, History, 
  Building, Target, TrendingUp, Users, ShoppingCart, 
  DollarSign, BarChart3, Lightbulb, FileText, AlertCircle,
  CheckCircle, Clock, Zap, Star, Award, MessageCircle,
  ArrowRight, ChevronDown, ChevronRight, Globe, MapPin,
  Sparkles, TrendingDown, Calendar, Briefcase
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

// Configuração das seções do briefing com cores e gradientes modernos
const BRIEFING_SECTIONS = {
  overview: {
    id: 'overview',
    title: 'Visão Geral',
    shortTitle: 'Geral',
    icon: Building,
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    description: 'Contexto geral, missão, visão e valores da empresa'
  },
  products: {
    id: 'products',
    title: 'Produtos & Serviços',
    shortTitle: 'Produtos',
    icon: ShoppingCart,
    gradient: 'from-emerald-500 to-green-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    description: 'Portfólio completo de produtos e serviços'
  },
  market: {
    id: 'market',
    title: 'Cenário de Mercado',
    shortTitle: 'Mercado',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    description: 'Análise do mercado e oportunidades'
  },
  value_prop: {
    id: 'value_prop',
    title: 'Proposta de Valor',
    shortTitle: 'Valor',
    icon: Star,
    gradient: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    description: 'Diferenciação e proposta única'
  },
  channels: {
    id: 'channels',
    title: 'Canais de Venda',
    shortTitle: 'Canais',
    icon: Globe,
    gradient: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    textColor: 'text-cyan-700',
    description: 'Canais e estratégia de distribuição'
  },
  financial: {
    id: 'financial',
    title: 'Dados Financeiros',
    shortTitle: 'Financeiro',
    icon: DollarSign,
    gradient: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    description: 'Indicadores financeiros e performance'
  },
  competition: {
    id: 'competition',
    title: 'Concorrência',
    shortTitle: 'Concorrentes',
    icon: BarChart3,
    gradient: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    description: 'Análise competitiva e benchmarking'
  },
  history: {
    id: 'history',
    title: 'Histórico & Evolução',
    shortTitle: 'Histórico',
    icon: History,
    gradient: 'from-slate-500 to-gray-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-700',
    description: 'Evolução e aprendizados ao longo do tempo'
  }
};

// Componente de status moderno
const BriefingStatus = ({ status, completionScore }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'DRAFT':
        return { 
          label: 'Rascunho', 
          gradient: 'from-gray-500 to-slate-600',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          icon: Edit
        };
      case 'IN_REVIEW':
        return { 
          label: 'Em Revisão', 
          gradient: 'from-amber-500 to-orange-600',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          icon: Clock
        };
      case 'READY':
        return { 
          label: 'Aprovado', 
          gradient: 'from-green-500 to-emerald-600',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          icon: CheckCircle
        };
      default:
        return { 
          label: 'Indefinido', 
          gradient: 'from-gray-400 to-gray-500',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-600',
          icon: AlertCircle
        };
    }
  };

  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4"
    >
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${config.bgColor} border-2 ${config.bgColor.replace('bg-', 'border-').replace('-50', '-200')}`}>
        <StatusIcon className="w-4 h-4" />
        <span className={`font-semibold ${config.textColor}`}>{config.label}</span>
      </div>
      
      {completionScore !== undefined && (
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: 'auto' }}
          className="flex items-center gap-3"
        >
          <div className="flex flex-col items-end">
            <div className="text-sm font-semibold text-gray-700">{completionScore}% completo</div>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${completionScore}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              />
            </div>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r ${completionScore >= 80 ? 'from-green-500 to-emerald-600' : completionScore >= 50 ? 'from-amber-500 to-orange-600' : 'from-red-500 to-rose-600'}`}>
            {completionScore}%
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Componente para campo editável moderno
const ModernEditableField = ({ 
  label, 
  value, 
  type = 'text', 
  multiline = false, 
  placeholder = '', 
  onSave,
  required = false,
  icon: Icon
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (required && !editValue.trim()) {
      toast.error('Este campo é obrigatório');
      return;
    }

    setSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      toast.success('Campo atualizado com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 p-4 bg-blue-50 rounded-xl border-2 border-blue-200"
      >
        <label className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </label>
        {multiline ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="min-h-[120px] border-blue-200 focus:border-blue-400 focus:ring-blue-200"
            rows={4}
          />
        ) : (
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="border-blue-200 focus:border-blue-400 focus:ring-blue-200"
          />
        )}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={saving}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            {saving ? <Clock className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            Salvar
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="w-3 h-3 mr-1" />
            Cancelar
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <label className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
            {Icon && <Icon className="w-4 h-4 text-blue-500" />}
            {label}
          </label>
          <div className={`text-gray-700 leading-relaxed ${!value ? 'text-gray-400 italic' : ''}`}>
            {value || (
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {placeholder || 'Clique para adicionar...'}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 hover:bg-blue-100 text-blue-600"
        >
          <Edit className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// Componente para lista editável moderna
const ModernEditableList = ({ 
  label, 
  items = [], 
  onUpdate, 
  placeholder = 'Adicionar item...',
  icon: Icon,
  emptyMessage = 'Nenhum item adicionado ainda.'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState(items);
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      setEditItems([...editItems, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (index) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      await onUpdate(editItems);
      setIsEditing(false);
      toast.success('Lista atualizada com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar alterações');
    }
  };

  const handleCancel = () => {
    setEditItems(items);
    setNewItem('');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 p-5 bg-blue-50 rounded-xl border-2 border-blue-200"
      >
        <label className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </label>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {editItems.map((item, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-white p-3 rounded-lg border border-blue-200"
            >
              <Input
                value={item}
                onChange={(e) => {
                  const newItems = [...editItems];
                  newItems[index] = e.target.value;
                  setEditItems(newItems);
                }}
                className="flex-1 border-0 bg-transparent"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveItem(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white p-3 rounded-lg border-2 border-dashed border-blue-300">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={placeholder}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            className="flex-1 border-0 bg-transparent"
          />
          <Button 
            onClick={handleAddItem} 
            disabled={!newItem.trim()}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            onClick={handleSave}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <Save className="w-3 h-3 mr-1" />
            Salvar Lista
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="w-3 h-3 mr-1" />
            Cancelar
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-start justify-between mb-3">
        <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-blue-500" />}
          {label}
        </label>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 hover:bg-blue-100 text-blue-600"
        >
          <Edit className="w-4 h-4" />
        </Button>
      </div>
      
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.slice(0, 3).map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 text-sm text-gray-700 p-2 bg-gray-50 rounded-lg"
            >
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
              <span className="flex-1">{item}</span>
            </motion.div>
          ))}
          {items.length > 3 && (
            <div className="text-xs text-gray-500 italic pl-5">
              +{items.length - 3} itens adicionais...
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-400 italic">
          <Plus className="w-4 h-4" />
          {emptyMessage}
        </div>
      )}
    </motion.div>
  );
};

// Seções modernizadas
const ModernOverviewSection = ({ briefing, onUpdate }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ModernEditableField
        label="Missão da Empresa"
        value={briefing?.mission}
        multiline
        placeholder="Qual é a missão da empresa?"
        onSave={(value) => onUpdate({ mission: value })}
        icon={Target}
      />
      <ModernEditableField
        label="Visão da Empresa"
        value={briefing?.vision}
        multiline
        placeholder="Qual é a visão da empresa?"
        onSave={(value) => onUpdate({ vision: value })}
        icon={Eye}
      />
    </div>
    
    <ModernEditableList
      label="Valores da Empresa"
      items={briefing?.values || []}
      onUpdate={(values) => onUpdate({ values })}
      placeholder="Ex: Inovação, Transparência, Excelência..."
      icon={Award}
      emptyMessage="Adicione os valores que guiam a empresa."
    />

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ModernEditableField
        label="Segmento de Mercado"
        value={briefing?.market_segment}
        placeholder="Ex: B2B, B2C, SaaS, E-commerce..."
        onSave={(value) => onUpdate({ market_segment: value })}
        icon={Users}
      />
      <ModernEditableField
        label="Localização Principal"
        value={briefing?.location}
        placeholder="Cidade, Estado, País"
        onSave={(value) => onUpdate({ location: value })}
        icon={MapPin}
      />
    </div>

    <ModernEditableField
      label="Objetivos de Negócio"
      value={briefing?.business_objectives}
      multiline
      placeholder="Quais são os principais objetivos da empresa? Crescimento, expansão, melhoria da experiência do cliente..."
      onSave={(value) => onUpdate({ business_objectives: value })}
      icon={Target}
    />
  </div>
);

const ModernProductsSection = ({ briefing, onUpdate }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ModernEditableList
        label="Principais Produtos"
        items={briefing?.main_products || []}
        onUpdate={(main_products) => onUpdate({ main_products })}
        placeholder="Nome do produto - Descrição - Preço"
        icon={ShoppingCart}
        emptyMessage="Adicione os principais produtos da empresa."
      />
      <ModernEditableList
        label="Principais Serviços"
        items={briefing?.main_services || []}
        onUpdate={(main_services) => onUpdate({ main_services })}
        placeholder="Nome do serviço - Descrição - Valor"
        icon={Briefcase}
        emptyMessage="Adicione os principais serviços oferecidos."
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ModernEditableField
        label="Produto Mais Vendido"
        value={briefing?.best_seller}
        placeholder="Qual produto/serviço tem melhor performance?"
        onSave={(value) => onUpdate({ best_seller: value })}
        icon={TrendingUp}
      />
      <ModernEditableField
        label="Produto Premium"
        value={briefing?.premium_product}
        placeholder="Produto/serviço de maior valor agregado"
        onSave={(value) => onUpdate({ premium_product: value })}
        icon={Star}
      />
    </div>

    <ModernEditableField
      label="Diferenciações dos Produtos"
      value={briefing?.product_differentiation}
      multiline
      placeholder="O que torna seus produtos únicos? Qualidade, preço, inovação, suporte..."
      onSave={(value) => onUpdate({ product_differentiation: value })}
      icon={Sparkles}
    />
  </div>
);

const ModernMarketSection = ({ briefing, onUpdate }) => (
  <div className="space-y-6">
    <ModernEditableList
      label="Principais Oportunidades"
      items={briefing?.market_opportunities || []}
      onUpdate={(market_opportunities) => onUpdate({ market_opportunities })}
      placeholder="Descrever oportunidade de mercado..."
      icon={TrendingUp}
      emptyMessage="Nenhuma oportunidade de mercado adicionada."
    />

    <ModernEditableList
      label="Principais Desafios"
      items={briefing?.market_challenges || []}
      onUpdate={(market_challenges) => onUpdate({ market_challenges })}
      placeholder="Descrever desafio enfrentado..."
      icon={TrendingDown}
      emptyMessage="Nenhum desafio de mercado adicionado."
    />

    <ModernEditableList
      label="Tendências do Mercado"
      items={briefing?.market_trends || []}
      onUpdate={(market_trends) => onUpdate({ market_trends })}
      placeholder="Tendência observada no setor..."
      icon={Calendar}
      emptyMessage="Nenhuma tendência de mercado adicionada."
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ModernEditableField
        label="Tamanho do Mercado"
        value={briefing?.market_size}
        placeholder="Ex: R$ 10 bilhões, 500 mil clientes potenciais..."
        onSave={(value) => onUpdate({ market_size: value })}
        icon={DollarSign}
      />
      <ModernEditableField
        label="Taxa de Crescimento"
        value={briefing?.growth_rate}
        placeholder="Ex: 15% ao ano, 3% ao trimestre..."
        onSave={(value) => onUpdate({ growth_rate: value })}
        icon={BarChart3}
      />
    </div>
  </div>
);

const ModernValuePropositionSection = ({ briefing, onUpdate }) => (
  <div className="space-y-6">
    <ModernEditableField
      label="Proposta de Valor Principal"
      value={briefing?.main_value_proposition}
      multiline
      placeholder="O que torna sua empresa única? Por que clientes escolhem vocês?"
      onSave={(value) => onUpdate({ main_value_proposition: value })}
      required
      icon={Sparkles}
    />

    <ModernEditableField
      label="Unique Selling Proposition (USP)"
      value={briefing?.usp}
      multiline
      placeholder="Qual é o diferencial único que nenhum concorrente oferece?"
      onSave={(value) => onUpdate({ usp: value })}
      icon={Award}
    />

    <ModernEditableList
      label="Principais Diferenciações"
      items={briefing?.key_differentiators || []}
      onUpdate={(key_differentiators) => onUpdate({ key_differentiators })}
      placeholder="Ex: Atendimento 24h, Garantia vitalícia, Tecnologia exclusiva..."
      icon={Star}
      emptyMessage="Nenhuma diferenciação principal adicionada."
    />

    <ModernEditableField
      label="Benefícios Mensuráveis"
      value={briefing?.measurable_benefits}
      multiline
      placeholder="Ex: 30% mais eficiente, 50% mais durável, economia de R$ 1000/mês..."
      onSave={(value) => onUpdate({ measurable_benefits: value })}
      icon={DollarSign}
    />
  </div>
);

const ModernChannelsSection = ({ briefing, onUpdate }) => (
  <div className="space-y-6">
    <ModernEditableList
      label="Canais Online"
      items={briefing?.online_channels || []}
      onUpdate={(online_channels) => onUpdate({ online_channels })}
      placeholder="Ex: E-commerce próprio, Amazon, Mercado Livre..."
      icon={Globe}
      emptyMessage="Nenhum canal online adicionado."
    />

    <ModernEditableList
      label="Canais Offline"
      items={briefing?.offline_channels || []}
      onUpdate={(offline_channels) => onUpdate({ offline_channels })}
      placeholder="Ex: Loja física, Distribuidores, Parcerias..."
      icon={MapPin}
      emptyMessage="Nenhum canal offline adicionado."
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ModernEditableField
        label="Canal de Maior Volume"
        value={briefing?.top_channel}
        placeholder="Qual canal gera mais vendas?"
        onSave={(value) => onUpdate({ top_channel: value })}
        icon={Zap}
      />
      <ModernEditableField
        label="Canal em Crescimento"
        value={briefing?.growing_channel}
        placeholder="Qual canal está crescendo mais?"
        onSave={(value) => onUpdate({ growing_channel: value })}
        icon={TrendingUp}
      />
    </div>

    <ModernEditableField
      label="Estratégia de Distribuição"
      value={briefing?.distribution_strategy}
      multiline
      placeholder="Como os produtos chegam ao cliente final? Logística, parcerias, modelo de distribuição..."
      onSave={(value) => onUpdate({ distribution_strategy: value })}
      icon={ArrowRight}
    />
  </div>
);

const ModernFinancialSection = ({ briefing, onUpdate }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <ModernEditableField
        label="Ticket Médio Geral"
        value={briefing?.average_ticket}
        type="text"
        placeholder="Ex: R$ 250,00"
        onSave={(value) => onUpdate({ average_ticket: value })}
        icon={DollarSign}
      />
      <ModernEditableField
        label="Faturamento Anual"
        value={briefing?.annual_revenue}
        placeholder="Ex: R$ 5 milhões"
        onSave={(value) => onUpdate({ annual_revenue: value })}
        icon={DollarSign}
      />
      <ModernEditableField
        label="Margem de Lucro Média"
        value={briefing?.profit_margin}
        placeholder="Ex: 35%"
        onSave={(value) => onUpdate({ profit_margin: value })}
        icon={DollarSign}
      />
    </div>

    <ModernEditableList
      label="Tickets por Produto/Serviço"
      items={briefing?.ticket_breakdown || []}
      onUpdate={(ticket_breakdown) => onUpdate({ ticket_breakdown })}
      placeholder="Ex: Produto X - R$ 150,00"
      icon={ShoppingCart}
      emptyMessage="Nenhum detalhe de ticket adicionado."
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ModernEditableField
        label="Sazonalidade"
        value={briefing?.seasonality}
        multiline
        placeholder="Como as vendas variam ao longo do ano? Meses melhores/piores..."
        onSave={(value) => onUpdate({ seasonality: value })}
        icon={Calendar}
      />
      <ModernEditableField
        label="Meta de Crescimento"
        value={briefing?.growth_target}
        placeholder="Ex: 25% de crescimento em 2024"
        onSave={(value) => onUpdate({ growth_target: value })}
        icon={Target}
      />
    </div>
  </div>
);

const ModernCompetitionSection = ({ briefing, onUpdate }) => (
  <div className="space-y-6">
    <ModernEditableList
      label="Concorrentes Diretos"
      items={briefing?.direct_competitors || []}
      onUpdate={(direct_competitors) => onUpdate({ direct_competitors })}
      placeholder="Nome do concorrente - Principais características"
      icon={Users}
      emptyMessage="Nenhum concorrente direto adicionado."
    />

    <ModernEditableList
      label="Concorrentes Indiretos"
      items={briefing?.indirect_competitors || []}
      onUpdate={(indirect_competitors) => onUpdate({ indirect_competitors })}
      placeholder="Empresa que compete por atenção/orçamento do cliente"
      icon={AlertCircle}
      emptyMessage="Nenhum concorrente indireto adicionado."
    />

    <ModernEditableField
      label="Análise Competitiva"
      value={briefing?.competitive_analysis}
      multiline
      placeholder="Como vocês se comparam com a concorrência? Preços, qualidade, atendimento..."
      onSave={(value) => onUpdate({ competitive_analysis: value })}
      icon={MessageCircle}
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ModernEditableField
        label="Principal Vantagem Competitiva"
        value={briefing?.competitive_advantage}
        multiline
        placeholder="O que vocês fazem melhor que a concorrência?"
        onSave={(value) => onUpdate({ competitive_advantage: value })}
        icon={Award}
      />
      <ModernEditableField
        label="Maior Ameaça Competitiva"
        value={briefing?.competitive_threat}
        multiline
        placeholder="Qual concorrente ou tendência representa maior risco?"
        onSave={(value) => onUpdate({ competitive_threat: value })}
        icon={AlertCircle}
      />
    </div>
  </div>
);

const ModernHistorySection = ({ briefing, learnings, onUpdate }) => (
  <div className="space-y-6">
    <ModernEditableList
      label="Marcos Importantes"
      items={briefing?.key_milestones || []}
      onUpdate={(key_milestones) => onUpdate({ key_milestones })}
      placeholder="Ex: 2020 - Lançamento do produto X"
      icon={Clock}
      emptyMessage="Nenhum marco importante adicionado."
    />

    <ModernEditableField
      label="Evolução da Estratégia"
      value={briefing?.strategy_evolution}
      multiline
      placeholder="Como a estratégia de marketing/vendas evoluiu ao longo do tempo?"
      onSave={(value) => onUpdate({ strategy_evolution: value })}
      icon={History}
    />

    {learnings && learnings.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-blue-500" />
          Aprendizados Recentes
        </h4>
        <div className="space-y-3">
          {learnings.slice(0, 5).map((learning) => (
            <motion.div 
              key={learning.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400 shadow-sm"
            >
              <h5 className="font-medium text-blue-900">{learning.title}</h5>
              <p className="text-sm text-blue-700 mt-1">{learning.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 bg-blue-100">
                  Confiança: {learning.confidence_score}%
                </Badge>
                <span className="text-xs text-blue-600">
                  {new Date(learning.created_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )}
  </div>
);


// Componente principal da página de briefing
export default function BriefingMasterPage({ client }) {
  const { agencyId } = useSession();
  const [briefing, setBriefing] = useState(null);
  const [learnings, setLearnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar dados do briefing
  const loadBriefingData = useCallback(async () => {
    if (!client?.id || !agencyId) return;

    try {
      setLoading(true);

      // Buscar briefing existente
      const briefs = await Brief.filter({ 
        agencyId, 
        projectId: client.id 
      }, '-updated_date', 1);

      let briefingData = briefs[0];

      // Se não existe briefing, criar um novo
      if (!briefingData) {
        briefingData = await Brief.create({
          agencyId,
          projectId: client.id,
          status: 'DRAFT',
          completion_score: 0
        });
      }

      setBriefing(briefingData);

      // Carregar aprendizados relacionados
      const clientLearnings = await LearningEntry.filter({
        agencyId,
        projectId: client.id,
        status: 'ready'
      }, '-created_date', 10);

      setLearnings(clientLearnings);

    } catch (error) {
      console.error('Erro ao carregar briefing:', error);
      toast.error('Erro ao carregar dados do briefing');
    } finally {
      setLoading(false);
    }
  }, [client?.id, agencyId]);

  useEffect(() => {
    loadBriefingData();
  }, [loadBriefingData]);

  // Atualizar briefing
  const updateBriefing = useCallback(async (updates) => {
    if (!briefing?.id) return;

    setIsSaving(true);
    try {
      const updatedBriefing = await Brief.update(briefing.id, {
        ...briefing,
        ...updates,
        updated_date: new Date().toISOString()
      });

      setBriefing(updatedBriefing);
      
      // Recalcular score de completude (simulado)
      const completionScore = calculateCompletionScore(updatedBriefing);
      if (completionScore !== briefing.completion_score) {
        await Brief.update(briefing.id, { completion_score: completionScore });
        setBriefing(prev => ({ ...prev, completion_score: completionScore }));
      }

    } catch (error) {
      console.error('Erro ao atualizar briefing:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [briefing]);

  // Calcular score de completude
  const calculateCompletionScore = (briefingData) => {
    const fields = [
      'mission', 'vision', 'values', 'business_objectives',
      'main_products', 'main_services', 'main_value_proposition',
      'online_channels', 'offline_channels', 'average_ticket'
    ];
    
    const filledFields = fields.filter(field => {
      const value = briefingData[field];
      return value && (Array.isArray(value) ? value.length > 0 : value.toString().trim());
    });

    return Math.round((filledFields.length / fields.length) * 100);
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
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Carregando Briefing</h3>
          <p className="text-gray-600">Preparando as informações do cliente...</p>
        </div>
      </motion.div>
    );
  }

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return <ModernOverviewSection briefing={briefing} onUpdate={updateBriefing} />;
      case 'products':
        return <ModernProductsSection briefing={briefing} onUpdate={updateBriefing} />;
      case 'market':
        return <ModernMarketSection briefing={briefing} onUpdate={updateBriefing} />;
      case 'value_prop':
        return <ModernValuePropositionSection briefing={briefing} onUpdate={updateBriefing} />;
      case 'channels':
        return <ModernChannelsSection briefing={briefing} onUpdate={updateBriefing} />;
      case 'financial':
        return <ModernFinancialSection briefing={briefing} onUpdate={updateBriefing} />;
      case 'competition':
        return <ModernCompetitionSection briefing={briefing} onUpdate={updateBriefing} />;
      case 'history':
        return <ModernHistorySection briefing={briefing} learnings={learnings} onUpdate={updateBriefing} />;
      default:
        return <ModernOverviewSection briefing={briefing} onUpdate={updateBriefing} />;
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header Moderno */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Briefing Mestre
                    </h1>
                    <p className="text-gray-600 mt-1 text-lg">
                      {client?.company || client?.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Cenário completo de mercado e estratégia
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                  <BriefingStatus 
                    status={briefing?.status} 
                    completionScore={briefing?.completion_score} 
                  />
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowHistory(true)}
                    className="border-gray-300 hover:border-blue-400 hover:text-blue-600"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Histórico
                  </Button>
                </div>
              </div>

              {isSaving && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mt-4 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Clock className="w-4 h-4" />
                  </motion.div>
                  Salvando alterações automaticamente...
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Navegação por Tabs Moderna */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
                <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-1 bg-transparent">
                  {Object.values(BRIEFING_SECTIONS).map((section) => {
                    const SectionIcon = section.icon;
                    const isActive = activeSection === section.id;
                    
                    return (
                      <TabsTrigger
                        key={section.id}
                        value={section.id}
                        className={`
                          flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 
                          data-[state=active]:bg-gradient-to-r data-[state=active]:${section.gradient} 
                          data-[state=active]:text-white data-[state=active]:shadow-lg 
                          hover:bg-gray-50 data-[state=active]:hover:bg-gradient-to-r
                        `}
                      >
                        <SectionIcon className="w-5 h-5" />
                        <span className="text-xs font-semibold hidden lg:block">
                          {section.shortTitle}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {/* Conteúdo da Seção */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl shadow-xl border border-gray-200"
                >
                  <div className="p-8">
                    <div className="mb-8">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${BRIEFING_SECTIONS[activeSection].gradient} flex items-center justify-center shadow-lg`}>
                          {React.createElement(BRIEFING_SECTIONS[activeSection].icon, {
                            className: "w-6 h-6 text-white"
                          })}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            {BRIEFING_SECTIONS[activeSection].title}
                          </h2>
                          <p className="text-gray-600">
                            {BRIEFING_SECTIONS[activeSection].description}
                          </p>
                        </div>
                      </div>
                      <Separator className="bg-gradient-to-r from-gray-200 to-gray-100" />
                    </div>

                    {renderSectionContent()}
                  </div>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </motion.div>
        </div>

        {/* Dialog de Histórico Melhorado */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <History className="w-6 h-6 text-blue-600" />
                Histórico do Briefing
              </DialogTitle>
              <DialogDescription>
                Acompanhe a evolução do briefing ao longo do tempo
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900">Briefing criado</div>
                  <div className="text-sm text-blue-700">
                    {new Date(briefing?.created_date).toLocaleString('pt-BR')}
                  </div>
                </div>
              </motion.div>
              
              {briefing?.updated_date !== briefing?.created_date && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <Edit className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-green-900">Última atualização</div>
                    <div className="text-sm text-green-700">
                      {new Date(briefing?.updated_date).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
