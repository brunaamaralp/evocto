
import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Bot,
  Eye,
  EyeOff,
  FileText,
  Link as LinkIcon,
  AlertTriangle,
  Layers,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const impactConfig = {
  high: { color: 'bg-red-100 text-red-800', label: 'Alto Impacto', icon: TrendingUp },
  medium: { color: 'bg-amber-100 text-amber-800', label: 'Médio Impacto', icon: TrendingUp },
  low: { color: 'bg-green-100 text-green-800', label: 'Baixo Impacto', icon: TrendingDown }
};

const sourceIcons = {
  meeting_transcript: FileText,
  performance_report: FileText,
  library_learning: Eye,
  manual_note: User,
  cycle_approval: FileText,
  briefing_update: FileText
};

export default function EvolutionEventCard({ event, config, isAggregated, subEvents }) {
  const [expanded, setExpanded] = useState(false);
  
  const IconComponent = config?.icon || FileText;
  const SourceIcon = sourceIcons[event.source?.kind] || FileText;
  const ImpactIcon = impactConfig[event.impact]?.icon || TrendingUp;

  const formatMetrics = (metrics) => {
    if (!metrics) return null;
    
    const formatted = [];
    if (metrics.ctr_improvement) formatted.push(`CTR +${(metrics.ctr_improvement * 100).toFixed(1)}%`);
    if (metrics.cpl && metrics.cpl_target) formatted.push(`CPL: R$ ${metrics.cpl.toFixed(2)} (Meta: R$ ${metrics.cpl_target.toFixed(2)})`);
    if (metrics.conversion_rate) formatted.push(`Conv: ${metrics.conversion_rate}%`);
    
    return formatted.length > 0 ? formatted.join(' • ') : null;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  if (isAggregated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 to-transparent"></div>
        <Card className="ml-12 bg-slate-50 border-l-4 border-l-slate-400">
           <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg bg-slate-100`}>
                    <Layers className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{event.title}</h3>
                    <p className="text-slate-600 text-sm">{event.description}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
           </CardHeader>
           <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <CardContent className="pl-12 space-y-3">
                  {subEvents.map(sub => (
                    <EvolutionEventCard key={sub.id} event={sub} config={config} />
                  ))}
                </CardContent>
              </motion.div>
            )}
           </AnimatePresence>
        </Card>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Timeline connector */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-200 to-transparent"></div>
        
        <Card className="ml-12 bg-white/80 backdrop-blur-sm border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* Event Icon */}
                <div className={`p-2 rounded-lg ${config?.color.replace('text-', 'bg-').replace('800', '100')}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{event.title}</h3>
                    <Badge className={config?.color}>
                      {config?.label}
                    </Badge>
                    <Badge className={impactConfig[event.impact]?.color}>
                      <ImpactIcon className="w-3 h-3 mr-1" />
                      {impactConfig[event.impact]?.label}
                    </Badge>
                    {event.requires_review && (
                      <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Revisão Necessária
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-slate-600 text-sm mb-3">{event.description}</p>
                  
                  {/* Métricas de impacto */}
                  {formatMetrics(event.metrics) && (
                    <div className="bg-slate-100 rounded-md px-3 py-2 mb-3">
                      <span className="text-sm font-medium text-slate-800">
                        📊 {formatMetrics(event.metrics)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Confiança */}
                <Tooltip>
                  <TooltipTrigger>
                    <Badge className={getConfidenceColor(event.confidence)}>
                      {Math.round(event.confidence * 100)}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Score de confiança do evento
                  </TooltipContent>
                </Tooltip>
                
                {/* Autoria */}
                <Tooltip>
                  <TooltipTrigger>
                    {event.authored_by === 'ai' ? (
                      <Bot className="w-4 h-4 text-purple-600" />
                    ) : (
                      <User className="w-4 h-4 text-blue-600" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {event.authored_by === 'ai' ? 'Gerado por IA' : 'Criado pelo usuário'}
                  </TooltipContent>
                </Tooltip>
                
                {/* Visibilidade */}
                <Tooltip>
                  <TooltipTrigger>
                    <Button variant="ghost" size="icon" className="w-7 h-7">
                    {event.visibility?.isSharedToClient ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {event.visibility?.isSharedToClient ? 'Visível para o cliente' : 'Uso interno'}
                  </TooltipContent>
                </Tooltip>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            {/* Meta informações */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(event.date, "dd 'de' MMMM, HH:mm", { locale: ptBR })}
              </div>
              
              <div className="flex items-center gap-1">
                <SourceIcon className="w-3 h-3" />
                {event.source?.kind === 'meeting_transcript' && 'Reunião'}
                {event.source?.kind === 'performance_report' && 'Relatório'}
                {event.source?.kind === 'library_learning' && 'Biblioteca'}
                {event.source?.kind === 'manual_note' && 'Nota Manual'}
                {event.source?.kind === 'cycle_approval' && 'Aprovação de Ciclo'}
                {event.source?.kind === 'briefing_update' && 'Atualização do Briefing'}
              </div>
            </div>
          </CardHeader>
          
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 space-y-4">
                  {/* Before/After */}
                  {event.before_after && (event.before_after.before || event.before_after.after) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {event.before_after.before && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <h4 className="font-medium text-red-800 mb-2">Antes</h4>
                          <p className="text-sm text-red-700">{event.before_after.before}</p>
                        </div>
                      )}
                      {event.before_after.after && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-medium text-green-800 mb-2">Depois</h4>
                          <p className="text-sm text-green-700">{event.before_after.after}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Evidências */}
                  {event.source?.snippets && event.source.snippets.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <h4 className="font-medium text-slate-800 mb-2">Evidências</h4>
                      <ul className="space-y-1">
                        {event.source.snippets.map((snippet, index) => (
                          <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                            <span className="text-purple-600">•</span>
                            <span>{snippet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Links de navegação */}
                  {(event.links?.briefingSection || event.links?.planId || event.links?.learningId) && (
                    <div className="flex flex-wrap gap-2">
                      {event.links.briefingSection && (
                        <Button size="sm" variant="outline" className="h-8 px-3">
                          <LinkIcon className="w-3 h-3 mr-2" />
                          Ver no Briefing: {event.links.briefingSection}
                        </Button>
                      )}
                      
                      {event.links.planId && (
                        <Button size="sm" variant="outline" className="h-8 px-3">
                          <FileText className="w-3 h-3 mr-2" />
                          Ver Plano do Ciclo
                        </Button>
                      )}
                      
                      {event.links.learningId && (
                        <Button size="sm" variant="outline" className="h-8 px-3">
                          <Eye className="w-3 h-3 mr-2" />
                          Ver Aprendizado
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}
