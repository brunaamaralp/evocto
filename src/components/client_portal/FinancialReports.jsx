import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Download, Eye, Calendar, 
  TrendingUp, AlertTriangle, CheckCircle2,
  BarChart3, PieChart, Target
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados de exemplo dos relatórios
const mockReports = {
  diagnosticos: [
    {
      id: "diag_001",
      title: "Diagnóstico de Comunicação e Marca - Janeiro 2024",
      type: "diagnostico_completo",
      status: "approved",
      createdAt: "2024-01-15T10:00:00Z",
      approvedAt: "2024-01-18T14:30:00Z",
      phase: "Concluído",
      summary: "Análise da presença de marca e mensagem revelou inconsistência entre canais e oportunidade clara de reforço de posicionamento.",
      keyFindings: [
        "Tom de voz desalinhado entre site e redes sociais",
        "Proposta de valor pouco clara no primeiro contato",
        "Concorrentes ocupando narrativas que a marca poderia reivindicar"
      ],
      recommendations: 3,
      pdfUrl: "#",
      nextSteps: "Iniciar Fase 2: Estratégia de Conteúdo e Posicionamento"
    }
  ],
  relatoriosMensais: [
    {
      id: "rel_001",
      title: "Relatório de Performance - Dezembro 2024",
      type: "acompanhamento_mensal",
      status: "pending_approval",
      createdAt: "2024-01-05T09:00:00Z",
      period: "Dezembro 2024",
      kpisSummary: {
        improved: 4,
        stable: 2,
        declined: 1
      },
      highlights: [
        "Redução de 15% no prazo médio de recebimento",
        "Melhoria de 3,2% na margem bruta",
        "Implementação de 85% das recomendações do mês anterior"
      ],
      pdfUrl: "#"
    }
  ],
  planosAcao: [
    {
      id: "plano_001",
      title: "Plano de Otimização - Q1 2024",
      type: "plano_acao",
      status: "in_execution",
      createdAt: "2024-01-20T11:00:00Z",
      approvedAt: "2024-01-22T16:00:00Z",
      objectives: [
        "Reduzir prazo médio de recebimento para 30 dias",
        "Aumentar margem bruta para 40%",
        "Otimizar capital de giro em R$ 300.000"
      ],
      progress: 65,
      tasksCompleted: 12,
      totalTasks: 18,
      estimatedCompletion: "2024-03-31T23:59:59Z",
      pdfUrl: "#"
    }
  ]
};

// Componente para cada relatório
const ReportCard = ({ report, type }) => {
  const getStatusBadge = (status) => {
    switch(status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Aprovado</Badge>;
      case "pending_approval":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
      case "in_execution":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Em Execução</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (reportType) => {
    switch(reportType) {
      case "diagnostico_completo": return <Target className="w-5 h-5 text-purple-600" />;
      case "acompanhamento_mensal": return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case "plano_acao": return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getTypeIcon(report.type)}
            <div>
              <CardTitle className="text-lg">{report.title}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Criado em {format(new Date(report.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          {getStatusBadge(report.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conteúdo específico por tipo */}
        {type === "diagnosticos" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">{report.summary}</p>
            {report.keyFindings && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Principais Descobertas:</h4>
                <ul className="space-y-1">
                  {report.keyFindings.map((finding, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.nextSteps && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">Próximos Passos:</p>
                <p className="text-sm text-blue-700">{report.nextSteps}</p>
              </div>
            )}
          </div>
        )}

        {type === "relatoriosMensais" && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                {report.kpisSummary.improved} KPIs melhoraram
              </span>
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-gray-400"></div>
                {report.kpisSummary.stable} estáveis
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                {report.kpisSummary.declined} pioraram
              </span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Destaques do Mês:</h4>
              <ul className="space-y-1">
                {report.highlights.map((highlight, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {type === "planosAcao" && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-900">Progresso Geral</span>
                <span className="text-sm text-gray-600">{report.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all" 
                  style={{ width: `${report.progress}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{report.tasksCompleted}/{report.totalTasks} tarefas concluídas</span>
              <span>Conclusão prevista: {format(new Date(report.estimatedCompletion), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Objetivos:</h4>
              <ul className="space-y-1">
                {report.objectives.map((objective, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <Target className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Visualizar
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente principal
export default function FinancialReports({ clientId }) {
  const [reports, setReports] = useState(mockReports);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Relatórios de Performance</h2>
        <p className="text-gray-600">Acompanhe relatórios de campanhas, diagnósticos e planos de ação</p>
      </div>

      {/* Tabs para diferentes tipos de relatórios */}
      <Tabs defaultValue="diagnosticos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diagnosticos" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Diagnósticos
          </TabsTrigger>
          <TabsTrigger value="mensais" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Relatórios Mensais
          </TabsTrigger>
          <TabsTrigger value="planos" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Planos de Ação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnosticos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Diagnósticos de Comunicação</h3>
            <Badge variant="outline">{reports.diagnosticos.length} relatório(s)</Badge>
          </div>
          <div className="grid gap-4">
            {reports.diagnosticos.map((report) => (
              <ReportCard key={report.id} report={report} type="diagnosticos" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mensais" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Relatórios de Acompanhamento</h3>
            <Badge variant="outline">{reports.relatoriosMensais.length} relatório(s)</Badge>
          </div>
          <div className="grid gap-4">
            {reports.relatoriosMensais.map((report) => (
              <ReportCard key={report.id} report={report} type="relatoriosMensais" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="planos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Planos de Ação</h3>
            <Badge variant="outline">{reports.planosAcao.length} plano(s)</Badge>
          </div>
          <div className="grid gap-4">
            {reports.planosAcao.map((report) => (
              <ReportCard key={report.id} report={report} type="planosAcao" />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}