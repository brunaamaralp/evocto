import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, AlertTriangle, XCircle, Eye, Code, Palette, 
  Layout, Zap, Users, Settings, ChevronRight, ChevronDown,
  Target, BookOpen, Activity, MessageCircle, BarChart3
} from 'lucide-react';

const DesignSystemAudit = () => {
  const [expandedSection, setExpandedSection] = useState(null);

  const auditResults = {
    // ✅ BEM IMPLEMENTADOS
    wellImplemented: {
      title: "✅ Bem Implementados",
      items: [
        {
          category: "Identidade Visual",
          component: "globals.css + CSS Variables",
          status: "excellent",
          details: [
            "Paleta consolidada azul (#3B82F6) e roxo (#8B5CF6)",
            "Variáveis CSS bem estruturadas",
            "Gradientes da marca consistentes",
            "Cores funcionais limitadas (sucesso, aviso, erro)"
          ]
        },
        {
          category: "Autenticação",
          component: "SessionManager + AuthGuards",
          status: "excellent", 
          details: [
            "Sistema robusto de autenticação",
            "Estados de sessão bem gerenciados",
            "Debug logging completo",
            "Tratamento de erros 401 com redirecionamento"
          ]
        },
        {
          category: "Layout",
          component: "SidebarSwitcher + ModernSidebar", 
          status: "excellent",
          details: [
            "Navegação contextual (agência vs cliente)",
            "Estados ativos com cores da marca",
            "Sidebar colapsível funcionando",
            "Responsive design implementado"
          ]
        },
        {
          category: "Roteamento",
          component: "Pages + createPageUrl",
          status: "good",
          details: [
            "Sistema de páginas bem estruturado",
            "Utilitário createPageUrl funcionando",
            "Navegação entre contextos",
            "Params de URL funcionais"
          ]
        }
      ]
    },

    // ⚠️ PARCIALMENTE IMPLEMENTADOS  
    partiallyImplemented: {
      title: "⚠️ Parcialmente Implementados",
      items: [
        {
          category: "Estados Vazios",
          component: "EmptyStates (disperso)",
          status: "warning",
          details: [
            "Alguns componentes têm estados vazios elegantes",
            "Outros ainda usam textos simples",
            "Falta padronização de ícones e mensagens",
            "Inconsistência nos CTAs de estados vazios"
          ],
          needsWork: [
            "Padronizar todos os estados vazios",
            "Criar componente reutilizável EmptyState",
            "Definir biblioteca de ícones para cada contexto",
            "Mensagens em português consistentes"
          ]
        },
        {
          category: "Loading States", 
          component: "LoadingStates (disperso)",
          status: "warning",
          details: [
            "Skeletons em algumas páginas",
            "Spinners simples em outras",
            "Falta de loading states em formulários",
            "Inconsistência visual"
          ],
          needsWork: [
            "Componentizar skeletons reutilizáveis",
            "Padronizar loading em botões e forms",
            "Implementar progressive loading",
            "Estados de carregamento com marca Evocto"
          ]
        },
        {
          category: "Cards e Listas",
          component: "ServiceCard, ClientCard, etc",
          status: "warning", 
          details: [
            "Cards individuais bem desenhados",
            "Hover effects consistentes",
            "Alguns ainda usam cores não-brand",
            "Falta padronização de métricas"
          ],
          needsWork: [
            "Revisar todas as cores dos badges",
            "Padronizar estrutura de cards",
            "Componentizar partes reutilizáveis",
            "Consolidar hover effects"
          ]
        },
        {
          category: "Formulários",
          component: "ClientForm, ServiceForm, etc",
          status: "warning",
          details: [
            "Formulários funcionais básicos",
            "Validação implementada",
            "Design inconsistente entre forms",
            "Falta estados de salvamento"
          ],
          needsWork: [
            "Criar FormWrapper padronizado",
            "Implementar auto-save",
            "Padronizar mensagens de erro",
            "Estados de loading em forms"
          ]
        }
      ]
    },

    // ❌ PROBLEMÁTICOS
    needsImprovement: {
      title: "❌ Precisam de Melhoria",
      items: [
        {
          category: "Componentes de Status",
          component: "StatusBadge (disperso)",
          status: "error",
          details: [
            "Cada página implementa seus próprios badges",
            "Cores inconsistentes para mesmo status",
            "Lógica duplicada em vários arquivos",
            "Textos em português/inglês misturados"
          ],
          needsWork: [
            "Criar StatusBadge universal",
            "Definir mapeamento de cores por status",
            "Centralizar lógica de status",
            "Padronizar todos os textos em português"
          ]
        },
        {
          category: "Navegação",
          component: "Links e Navigation", 
          status: "error",
          details: [
            "Mistura de window.location.href e Link",
            "Alguns links quebrados ou inconsistentes",
            "Falta de loading states em navegação",
            "Breadcrumbs inexistentes"
          ],
          needsWork: [
            "Padronizar uso do Link do React Router",
            "Implementar SafeLink component",
            "Adicionar breadcrumbs nas páginas",
            "Loading states em transições"
          ]
        },
        {
          category: "Tratamento de Erros",
          component: "ErrorBoundary + Error States",
          status: "error", 
          details: [
            "ErrorBoundary existe mas não é usado consistentemente",
            "Páginas crasham sem feedback elegante",
            "Mensagens de erro técnicas para usuário",
            "Falta retry mechanisms"
          ],
          needsWork: [
            "Implementar ErrorBoundary em todas as páginas",
            "Criar ErrorState component padronizado", 
            "Mensagens de erro amigáveis",
            "Botões de retry e suporte"
          ]
        },
        {
          category: "Acessibilidade",
          component: "A11y (geral)",
          status: "error",
          details: [
            "Focus states básicos",
            "Falta de aria-labels",
            "Contraste não validado",
            "Navegação por teclado limitada"
          ],
          needsWork: [
            "Audit completo de acessibilidade",
            "Implementar focus management",
            "Adicionar aria-labels",
            "Testar navegação por teclado"
          ]
        }
      ]
    },

    // 🚀 RECOMENDAÇÕES
    recommendations: {
      title: "🚀 Recomendações de Arquitetura",
      items: [
        {
          category: "Design System",
          priority: "high",
          description: "Criar biblioteca de componentes reutilizáveis",
          actions: [
            "Componentizar EmptyState, LoadingState, ErrorState",
            "Padronizar StatusBadge, MetricCard, ActionCard", 
            "Criar Storybook para documentação",
            "Testes visuais automatizados"
          ]
        },
        {
          category: "Performance",
          priority: "medium", 
          description: "Otimizar carregamento e renderização",
          actions: [
            "Lazy loading de páginas pesadas",
            "Memoization em componentes complexos",
            "Otimização de re-renders",
            "Bundle analysis e code splitting"
          ]
        },
        {
          category: "UX Consistency",
          priority: "high",
          description: "Unificar experiência do usuário",
          actions: [
            "Micro-interactions padronizadas",
            "Transições consistentes (300ms)",
            "Feedback imediato em ações",
            "Loading states em todas as interações"
          ]
        }
      ]
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'excellent': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'good': return 'bg-blue-100 text-blue-700 border-blue-200'; 
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'error': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'excellent': return <CheckCircle className="w-4 h-4" />;
      case 'good': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Auditoria do Design System
        </h1>
        <p className="text-slate-600">Análise completa dos componentes do sistema Evocto</p>
      </div>

      {Object.entries(auditResults).map(([key, section]) => (
        <Card key={key} className="border-0 shadow-lg">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === key ? null : key)}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="text-lg">{section.title}</span>
              {expandedSection === key ? 
                <ChevronDown className="w-5 h-5" /> : 
                <ChevronRight className="w-5 h-5" />
              }
            </CardTitle>
          </CardHeader>
          
          {expandedSection === key && (
            <CardContent>
              <div className="space-y-6">
                {section.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={`${item.status ? getStatusColor(item.status) : 'bg-blue-100 text-blue-700'} border`}>
                          {item.status && getStatusIcon(item.status)}
                          <span className="ml-1">{item.category}</span>
                        </Badge>
                        <span className="font-medium text-slate-900">
                          {item.component || item.description}
                        </span>
                      </div>
                      {item.priority && (
                        <Badge variant={item.priority === 'high' ? 'default' : 'secondary'}>
                          {item.priority}
                        </Badge>
                      )}
                    </div>

                    {item.details && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Status Atual:</h4>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {item.details.map((detail, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <div className="w-1 h-1 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.needsWork && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Precisa de Trabalho:</h4>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {item.needsWork.map((work, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Target className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                              {work}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.actions && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Ações Recomendadas:</h4>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {item.actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Zap className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Summary */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Resumo Executivo</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-emerald-600 mb-1">4</div>
              <div className="text-sm text-slate-600">Bem Implementados</div>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-amber-600 mb-1">4</div>
              <div className="text-sm text-slate-600">Parcialmente</div>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">4</div>
              <div className="text-sm text-slate-600">Precisam Melhoria</div>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">3</div>
              <div className="text-sm text-slate-600">Recomendações</div>
            </div>
          </div>
          <p className="text-slate-600 max-w-2xl mx-auto">
            O sistema tem uma base sólida com identidade visual consolidada e autenticação robusta. 
            O foco agora deve ser na padronização de componentes e melhoria da experiência do usuário.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DesignSystemAudit;