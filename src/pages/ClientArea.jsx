import React, { useState, useEffect } from "react";
import { Project, Client, BriefingVersion } from "@/api/entities";
import { useSession } from "@/components/auth/SessionManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientArea() {
  const { user } = useSession();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadClientData();
    }
  }, [user]);

  const loadClientData = async () => {
    setLoading(true);
    try {
      // Find the client record associated with the current user
      const clientRecords = await Client.filter({ user_id: user.id });
      if (clientRecords.length === 0) {
        setProjects([]);
        return;
      }
      
      // Get all client IDs associated with the user
      const clientIds = clientRecords.map(c => c.id);

      // Fetch all projects for those clients
      const allProjects = await Project.list();
      const clientProjects = allProjects.filter(p => clientIds.includes(p.client_id));
      
      // Fetch latest version for each project to get approval status
      const versions = await BriefingVersion.list();
      
      const projectsWithStatus = clientProjects.map(project => {
        const projectVersions = versions
          .filter(v => v.briefing_id && v.scope_json?.project_id === project.id)
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        const latestVersion = projectVersions.find(v => v.status === 'approved') || projectVersions[0];
        
        return {
          ...project,
          publicLink: latestVersion?.public_share_token 
            ? createPageUrl(`PublicApproval?token=${latestVersion.public_share_token}`)
            : null,
        };
      });

      setProjects(projectsWithStatus.sort((a,b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusInfo = (status) => {
    const statusMap = {
      'rascunho': { text: 'Rascunho', color: 'bg-slate-100 text-slate-800', icon: <FileText className="w-3 h-3 mr-1.5"/> },
      'briefing': { text: 'Em Briefing', color: 'bg-blue-100 text-blue-800', icon: <FileText className="w-3 h-3 mr-1.5"/> },
      'analise': { text: 'Em Análise', color: 'bg-amber-100 text-amber-800', icon: <Clock className="w-3 h-3 mr-1.5"/> },
      'aprovacao': { text: 'Aguardando Aprovação', color: 'bg-purple-100 text-purple-800', icon: <Clock className="w-3 h-3 mr-1.5"/> },
      'aprovado': { text: 'Aprovado', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3 mr-1.5"/> },
      'em_andamento': { text: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3 mr-1.5"/> },
      'finalizado': { text: 'Finalizado', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3 mr-1.5"/> }
    };
    return statusMap[status] || statusMap['rascunho'];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Área do Cliente</h1>
          <p className="text-slate-600 mt-1">Acompanhe o status dos seus projetos.</p>
        </div>
      </div>

      {projects.length > 0 ? (
        <div className="space-y-4">
          {projects.map(project => {
            const statusInfo = getStatusInfo(project.status);
            return (
              <Card key={project.id} className="border-0 shadow-lg">
                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-grow">
                    <h3 className="font-bold text-slate-900 text-lg">{project.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Criado em: {format(new Date(project.created_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                     <Badge className={`${statusInfo.color} py-1 px-3 text-sm font-medium flex items-center`}>
                        {statusInfo.icon}
                        {statusInfo.text}
                     </Badge>
                     {project.publicLink && (
                        <a href={project.publicLink} target="_blank" rel="noopener noreferrer">
                           <Button variant="outline">
                              Ver Detalhes
                              <ExternalLink className="w-4 h-4 ml-2" />
                           </Button>
                        </a>
                     )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
         <Card className="border-0 shadow-lg text-center p-12">
            <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold">Nenhum projeto encontrado</h3>
            <p className="text-slate-500 mt-2">Ainda não há projetos associados à sua conta.</p>
        </Card>
      )}
    </div>
  );
}