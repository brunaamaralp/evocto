
import React from "react";
import { Service } from "@/api/entities";
import { Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2, Plus, CheckCircle2, ArrowRight } from "lucide-react";
import { createServiceInstance } from "@/api/functions";
import { fixServiceAgencyId } from "@/api/functions";
import { fixTemplateAgencyIds } from "@/api/functions";
import { createPageUrl } from "@/utils";

export default function ServiceInstanceEditorPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const serviceIdParam = urlParams.get("serviceId") || "";
  const clientIdParam = urlParams.get("clientId") || "";
  const templateIdParam = urlParams.get("templateId") || "";

  const [loading, setLoading] = React.useState(!!serviceIdParam);
  const [error, setError] = React.useState("");
  const [service, setService] = React.useState(null);

  // Estados para criação
  const [templates, setTemplates] = React.useState([]);
  const [clients, setClients] = React.useState([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState(templateIdParam || "");
  const [selectedClient, setSelectedClient] = React.useState(clientIdParam || "");
  const [creating, setCreating] = React.useState(false);
  const [fixing, setFixing] = React.useState(false);
  const [fixingTemplates, setFixingTemplates] = React.useState(false);
  const [invalidTemplateParam, setInvalidTemplateParam] = React.useState(false);

  // Dados auxiliares
  const [startDate, setStartDate] = React.useState("");
  const [contractValue, setContractValue] = React.useState("");

  // Carregar instância quando serviceId presente
  React.useEffect(() => {
    if (!serviceIdParam) return;
    let active = true;
    async function loadService() {
      try {
        setLoading(true);
        setError("");
        const s = await Service.get(serviceIdParam);
        if (!active) return;
        setService(s);
      } catch (e) {
        setError("Não foi possível carregar o serviço selecionado. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }
    loadService();
    return () => {
      active = false;
    };
  }, [serviceIdParam]);

  // Carregar templates e clientes para o fluxo de criação quando NÃO há serviceId
  React.useEffect(() => {
    if (serviceIdParam) return;
    let active = true;
    async function loadCreationData() {
      try {
        setError("");
        setInvalidTemplateParam(false);
        const [tpls, cls] = await Promise.all([
          Service.filter({ is_template: true, is_active: true }, "-updated_date", 500),
          Client.list("-updated_date", 500)
        ]);
        if (!active) return;
        setTemplates(tpls || []);
        setClients(cls || []);

        if (templateIdParam) {
          const exists = Array.isArray(tpls) && tpls.some(t => String(t.id) === String(templateIdParam));
          if (!exists) {
            setSelectedTemplate("");
            setInvalidTemplateParam(true);
            setError("O template informado na URL não foi encontrado. Pode ser um template antigo sem agencyId. Você pode tentar corrigir abaixo e recarregar a lista.");
          }
        }
      } catch (e) {
        setError("Falha ao carregar templates/clientes. Tente novamente.");
      }
    }
    loadCreationData();
    return () => {
      active = false;
    };
  }, [serviceIdParam, templateIdParam]);

  const handleFixTemplates = async () => {
    try {
      setFixingTemplates(true);
      setError("");
      const { data } = await fixTemplateAgencyIds({});
      // Recarregar listas
      const [tpls, cls] = await Promise.all([
        Service.filter({ is_template: true, is_active: true }, "-updated_date", 500),
        Client.list("-updated_date", 500)
      ]);
      setTemplates(tpls || []);
      setClients(cls || []);
      // Revalidar o templateIdParam após correção
      if (templateIdParam) {
        const exists = Array.isArray(tpls) && tpls.some(t => String(t.id) === String(templateIdParam));
        if (exists) {
          setSelectedTemplate(templateIdParam);
          setInvalidTemplateParam(false);
          setError("");
        } else {
          setSelectedTemplate("");
          setInvalidTemplateParam(true);
          setError("O template informado na URL ainda não foi encontrado após a correção. Selecione um template válido abaixo.");
        }
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Falha ao corrigir templates.");
    } finally {
      setFixingTemplates(false);
    }
  };

  const handleCreateInstance = async () => {
    // Garantir que o template selecionado existe na lista atual
    const templateExists = templates.some(t => String(t.id) === String(selectedTemplate));
    if (!selectedTemplate || !templateExists) {
      setError("Selecione um template válido da lista.");
      return;
    }
    if (!selectedClient) {
      setError("Selecione um cliente.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const selectedTplObj = templates.find(t => String(t.id) === String(selectedTemplate));

      const { data } = await createServiceInstance({
        templateId: selectedTemplate,
        templateName: selectedTplObj?.name || null,
        clientId: selectedClient,
        startDate: startDate || undefined,
        contractValue: contractValue ? Number(contractValue) : undefined,
        customizations: {}
      });

      if (!data?.success) {
        throw new Error(data?.error || "Falha ao criar a instância.");
      }

      const newId = data?.serviceInstance?.id;
      if (newId) {
        window.location.href = createPageUrl("service-detail") + `?serviceId=${newId}`;
      } else {
        setError("Instância criada, mas não foi possível obter o ID do serviço.");
      }
    } catch (e) {
      const serverMsg = e?.response?.data?.error;
      setError(serverMsg || (typeof e?.message === "string" ? e.message : "Erro ao criar a instância."));
    } finally {
      setCreating(false);
    }
  };

  const handleFixService = async () => {
    if (!serviceIdParam) return;
    setFixing(true);
    setError("");
    try {
      const { data } = await fixServiceAgencyId({ serviceId: serviceIdParam });
      if (data?.success === true) {
        window.location.reload();
      } else {
        setError(data?.error || "Não foi possível corrigir o serviço.");
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Falha ao corrigir o serviço.");
    } finally {
      setFixing(false);
    }
  };

  // UI quando existe serviceId (edição/leitura segura)
  if (serviceIdParam) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Carregando serviço...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="max-w-lg mx-auto p-6">
          <div className="flex items-start gap-3 p-4 border rounded-lg bg-red-50 text-red-700">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>
              <h2 className="font-semibold">Não foi possível abrir este serviço</h2>
              <p className="text-sm mt-1">{error}</p>
              {serviceIdParam && (
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleFixService} disabled={fixing}>
                    {fixing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Corrigindo...</> : "Corrigir serviço e tentar novamente"}
                  </Button>
                  <Button variant="outline" onClick={() => window.location.reload()} disabled={fixing}>
                    Tentar novamente
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (!service) {
      return (
        <div className="min-h-screen p-6">
          <div className="max-w-xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Serviço não encontrado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Verifique se o link está correto ou selecione um serviço na lista.
                </p>
                <Button onClick={() => window.location.href = createPageUrl("services")}>
                  Ir para Templates
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Cabeçalho mínimo seguro para editar/visualizar uma instância existente
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
              <p className="text-gray-600">
                Instância do cliente • {service.clientId ? "vinculada" : "não vinculada"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.href = createPageUrl("service-detail") + `?serviceId=${service.id}`}>
                Abrir Detalhe <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Categoria</div>
                  <div className="font-medium">{service.category}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-medium">{service.service_status || "setup"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Início</div>
                  <div className="font-medium">{service.start_date || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Deliverables</div>
                  <div className="font-medium">{Array.isArray(service.deliverables) ? service.deliverables.length : 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // UI quando NÃO existe serviceId: fluxo de criação guiado
  const createDisabled = creating || fixingTemplates || !selectedClient || !selectedTemplate || !templates.some(t => String(t.id) === String(selectedTemplate));

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Criar Instância de Serviço</h1>
        </div>

        {error && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5" />
                Atenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700">{error}</p>
              {invalidTemplateParam && (
                <div className="mt-4">
                  <Button onClick={handleFixTemplates} disabled={fixingTemplates}>
                    {fixingTemplates ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Corrigindo templates...</> : "Corrigir templates e atualizar lista"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Selecionar Template e Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Template</div>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {invalidTemplateParam && (
                <p className="text-xs text-amber-600 mt-2">
                  O ID recebido na URL não corresponde a nenhum template listado. Escolha um template acima ou use o botão de correção.
                </p>
              )}
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Cliente</div>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.legal_name || c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Data de início (opcional)</div>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Valor de contrato (opcional)</div>
                <Input type="number" step="0.01" placeholder="Ex.: 12000" value={contractValue} onChange={(e) => setContractValue(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleCreateInstance} disabled={createDisabled}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" /> Criar Instância
                  </>
                )}
              </Button>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Tarefas padrão serão geradas na ativação do serviço.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
