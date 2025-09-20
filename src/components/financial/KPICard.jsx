import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Calendar,
  Edit,
  MoreVertical,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function KPICard({ 
  kpi, 
  period = '6m', 
  onUpdate, 
  onEdit, 
  onDelete,
  compact = false,
  showActions = true
}) {
  const [hovering, setHovering] = useState(false);

  // Configurações visuais baseadas no status
  const statusConfig = {
    'good': {
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: <CheckCircle2 className="w-4 h-4 text-green-600" />
    },
    'warning': {
      color: 'text-amber-700',
      bgColor: 'bg-amber-50', 
      borderColor: 'border-amber-200',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />
    },
    'critical': {
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200', 
      icon: <AlertTriangle className="w-4 h-4 text-red-600" />
    },
    'no-data': {
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: <Clock className="w-4 h-4 text-gray-400" />
    },
    'neutral': {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: <Minus className="w-4 h-4 text-blue-600" />
    }
  };

  const config = statusConfig[kpi.status] || statusConfig.neutral;

  // Formatar valor baseado na unidade
  const formatValue = (value, unit) => {
    if (value === null || value === undefined) return 'N/A';

    switch (unit) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'ratio':
        return value.toFixed(2);
      case 'days':
        return `${value} dias`;
      default:
        return typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
    }
  };

  // Calcular progresso em relação à meta
  const calculateProgress = () => {
    if (!kpi.current_value || !kpi.target_value) return 0;
    const ratio = kpi.current_value / kpi.target_value;
    return Math.min(Math.max(ratio * 100, 0), 150); // Cap em 150% para visualização
  };

  const progress = calculateProgress();

  // Dados para o mini gráfico
  const chartData = (kpi.historical_values || [])
    .slice(-10) // Últimos 10 pontos
    .map((item, index) => ({
      index,
      value: item.value || 0
    }));

  const handleEdit = () => {
    onEdit?.(kpi);
  };

  const handleDelete = () => {
    onDelete?.(kpi);
  };

  return (
    <TooltipProvider>
      <Card 
        className={`transition-all duration-200 hover:shadow-md ${config.borderColor} ${
          hovering ? config.bgColor : ''
        }`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {config.icon}
                <span className="truncate">{kpi.name}</span>
                {kpi.priority === 'critical' && (
                  <Badge variant="destructive" className="text-xs">Crítico</Badge>
                )}
              </CardTitle>
              
              {!compact && kpi.description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-gray-500 line-clamp-2 cursor-help">
                      {kpi.description}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{kpi.description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Valor Principal */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-bold ${config.color}`}>
                {formatValue(kpi.current_value, kpi.unit)}
              </span>
              
              {kpi.trend && kpi.trend.status !== 'neutral' && (
                <div className={`flex items-center text-sm ${
                  kpi.trend.status === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.trend.status === 'up' ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {kpi.trend.percentage}%
                </div>
              )}
            </div>

            {/* Meta e Progresso */}
            {kpi.target_value && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Meta: {formatValue(kpi.target_value, kpi.unit)}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress 
                  value={progress} 
                  className={`h-2 ${
                    progress >= 100 ? '[&>div]:bg-green-500' :
                    progress >= 80 ? '[&>div]:bg-yellow-500' :
                    '[&>div]:bg-red-500'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Mini Gráfico */}
          {!compact && chartData.length > 0 && (
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={kpi.trend?.status === 'up' ? '#10b981' : kpi.trend?.status === 'down' ? '#ef4444' : '#6b7280'}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Metadados */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {kpi.lastUpdated ? 
                  new Date(kpi.lastUpdated).toLocaleDateString('pt-BR') : 
                  'Não calculado'
                }
              </span>
            </div>
            
            <Badge 
              variant="outline" 
              className={`text-xs ${getCategoryColor(kpi.category)}`}
            >
              {getCategoryName(kpi.category)}
            </Badge>
          </div>

          {/* Status de Dados */}
          {kpi.status === 'no-data' && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              ⚠️ Aguardando dados para cálculo
            </div>
          )}

          {kpi.calculation_metadata?.data_quality_issues?.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 cursor-help">
                  ⚠️ {kpi.calculation_metadata.data_quality_issues.length} problema(s) de dados
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {kpi.calculation_metadata.data_quality_issues.map((issue, i) => (
                    <p key={i} className="text-xs">{issue}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Funções auxiliares
function getCategoryColor(category) {
  const colors = {
    liquidez: 'text-blue-700 bg-blue-50',
    rentabilidade: 'text-green-700 bg-green-50',
    endividamento: 'text-red-700 bg-red-50',
    atividade: 'text-purple-700 bg-purple-50',
    crescimento: 'text-amber-700 bg-amber-50'
  };
  return colors[category] || 'text-gray-700 bg-gray-50';
}

function getCategoryName(category) {
  const names = {
    liquidez: 'Liquidez',
    rentabilidade: 'Rentabilidade', 
    endividamento: 'Endividamento',
    atividade: 'Atividade',
    crescimento: 'Crescimento'
  };
  return names[category] || category;
}