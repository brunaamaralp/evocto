import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Brief } from "@/api/entities";
import { Project } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, FileText, Filter, RefreshCw, Eye, Edit3 } from "lucide-react";
import { useSession } from "@/components/auth/SessionManager";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  READY: "bg-emerald-100 text-emerald-700",
};

function EmptyState({ title, description, action, actionText }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <FileText className="w-6 h-6 text-slate-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-slate-600 mt-1">{description}</p>
        {action && (
          <Button onClick={action} className="mt-4">
            {actionText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function BriefingsPage() {
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState("");
  const [briefs, setBriefs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ status: "all", q: "", projectId: "all" });
  const [creating, setCreating] = useState(false);
  const [newBrief, setNewBrief] = useState({ projectId: "", title: "", target_audience: "", objectives: "" });

  const loadData = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      // RLS garante dados da agência do usuário
      const [proj, br] = await Promise.all([
        Project.filter({}, "-updated_date", 200),
        Brief.filter({}, "-updated_date", 200),
      ]);
      setProjects(proj || []);
      setBriefs(br || []);
    } catch (e) {
      setError(e?.message || "Falha ao carregar briefings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = async () => {
    setReloading(true);
    await loadData();
    setReloading(false);
  };

  const filteredBriefs = useMemo(() => {
    return briefs.filter((b) => {
      const statusOk = filters.status === "all" || b.status === filters.status;
      const projOk = filters.projectId === "all" || b.projectId === filters.projectId;
      const q = (filters.q || "").toLowerCase().trim();
      const qOk =
        q.length === 0 ||
        (b.business_context || "").toLowerCase().includes(q) ||
        (b.objectives || "").toLowerCase().includes(q) ||
        (b.target_audience || "").toLowerCase().includes(q);
      return statusOk && projOk && qOk;
    });
  }, [briefs, filters]);

  const handleCreateBrief = async () => {
    if (!newBrief.projectId) return;
    setCreating(true);
    setError("");
    try {
      // Campos mínimos: agencyId e projectId são exigidos pelo schema
      const payload = {
        agencyId: session.agencyId,
        projectId: newBrief.projectId,
        business_context: newBrief.title || "Novo Briefing",
        target_audience: newBrief.target_audience || "",
        objectives: newBrief.objectives || "",
        status: "DRAFT",
      };
      await Brief.create(payload);
      setNewBrief({ projectId: "", title: "", target_audience: "", objectives: "" });
      await loadData();
    } catch (e) {
      setError(e?.message || "Falha ao criar briefing");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Briefings</h1>
            <p className="text-slate-600">Gerencie os briefings mestres por projeto.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refresh} disabled={reloading}>
              {reloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Atualizar
            </Button>
            <Button onClick={() => setCreating((s) => !s)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Briefing
            </Button>
          </div>
        </div>

        {creating && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Novo Briefing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Projeto</Label>
                  <Select
                    value={newBrief.projectId}
                    onValueChange={(v) => setNewBrief((s) => ({ ...s, projectId: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {projects.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Nenhum projeto encontrado. Crie um projeto antes de criar o briefing.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Título/Contexto</Label>
                  <Input
                    className="mt-1"
                    placeholder="Ex.: Contexto do cliente / produto"
                    value={newBrief.title}
                    onChange={(e) => setNewBrief((s) => ({ ...s, title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Objetivos (opcional)</Label>
                  <Input
                    className="mt-1"
                    placeholder="Ex.: Aumentar leads, melhorar CAC"
                    value={newBrief.objectives}
                    onChange={(e) => setNewBrief((s) => ({ ...s, objectives: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Público-alvo (opcional)</Label>
                  <Input
                    className="mt-1"
                    placeholder="Ex.: Gestores de marketing B2B, PMEs de tecnologia ..."
                    value={newBrief.target_audience}
                    onChange={(e) => setNewBrief((s) => ({ ...s, target_audience: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleCreateBrief}
                    disabled={creating || !newBrief.projectId}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Criar Briefing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters((s) => ({ ...s, status: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="DRAFT">Rascunho</SelectItem>
                  <SelectItem value="IN_REVIEW">Em Revisão</SelectItem>
                  <SelectItem value="READY">Pronto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Projeto</Label>
              <Select value={filters.projectId} onValueChange={(v) => setFilters((s) => ({ ...s, projectId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Buscar</Label>
              <Input
                className="mt-1"
                placeholder="Buscar por contexto, objetivos ou público"
                value={filters.q}
                onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-slate-600">
              <Loader2 className="w-5 h-5 mr-2 inline animate-spin" />
              Carregando briefings...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8">
              <p className="text-red-600 font-medium">Erro</p>
              <p className="text-slate-700">{error}</p>
              <Button variant="outline" className="mt-4" onClick={refresh}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : filteredBriefs.length === 0 ? (
          <EmptyState
            title="Nenhum briefing encontrado"
            description="Ajuste os filtros ou crie um novo briefing."
            action={() => setCreating(true)}
            actionText="Criar Briefing"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredBriefs.map((b) => (
              <Card key={b.id} className="border-0 shadow-sm hover:shadow-md transition">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={statusColors[b.status] || "bg-slate-100 text-slate-700"}>
                          {b.status === "DRAFT" ? "Rascunho" : b.status === "IN_REVIEW" ? "Em Revisão" : "Pronto"}
                        </Badge>
                        {b.completion_score != null && (
                          <Badge variant="outline" className="text-slate-700">
                            Completo: {Math.round(b.completion_score)}%
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mt-1 truncate">
                        {(b.business_context || "Briefing sem título").slice(0, 120)}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {b.objectives || "Sem objetivos cadastrados"}
                      </p>
                      {b.target_audience && (
                        <p className="text-xs text-slate-500 mt-1">Público: {b.target_audience}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button asChild variant="outline" size="sm" className="gap-2">
                        <Link to={createPageUrl(`briefing-editor?id=${b.id}`)}>
                          <Edit3 className="w-4 h-4" />
                          Abrir Editor
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Link to={createPageUrl(`customer-detail?id=${b.projectId}&tab=briefing`)}>
                          <Eye className="w-4 h-4" />
                          Ver Cliente
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Criado em {new Date(b.created_date).toLocaleDateString("pt-BR")}</span>
                    <span>Atualizado em {new Date(b.updated_date).toLocaleDateString("pt-BR")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}