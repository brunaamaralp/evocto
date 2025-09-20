
import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Scope, Brief, Project, Client, BriefingVersion, ScopeItem } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Save, Wand2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import ScopeCards from "../components/scope/ScopeCards";
import GuardrailsPanel from "../components/scope/GuardrailsPanel";
import TitleGenerator from "../components/scope/TitleGenerator";
import ApprovalFlow from "../components/approval/ApprovalFlow";
import ITip from '../components/shared/ITip'; // New import for ITip
import { toast } from "sonner";
import { DragDropContext } from '@hello-pangea/dnd';

// New ScopeHeader component to encapsulate the header logic
function ScopeHeader({ scope, project, client, onSave, isSaving, isGenerating, onGenerateAI, onBack }) {
  // This state is included as per the outline, though the primary dynamic title
  // of the scope is handled by TitleGenerator component. This might be for a
  // general project/scope header title display.
  const [title, setTitle] = useState(scope?.selected_title || project?.title || 'Novo Escopo');

  // Effect to update the header title if scope or project props change
  useEffect(() => {
    if (scope || project) {
      setTitle(scope?.selected_title || project?.title || 'Novo Escopo');
    }
  }, [scope, project]);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center">
          Escopo do Projeto
          {/* ITip component added as per outline */}
          <ITip termSlug="escopo-in-out" />
        </h1>
        <p className="text-slate-600 mt-1">
          {project?.title} para {client?.name}
        </p>
      </div>
      {/* Buttons moved from ScopeEditor to ScopeHeader */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button variant="outline" onClick={onGenerateAI} disabled={isGenerating}>
          <Wand2 className="w-4 h-4 mr-2" />
          Gerar com IA
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}


export default function ScopeEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scope, setScope] = useState(null);
  const [brief, setBrief] = useState(null);
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scopeItems, setScopeItems] = useState([]);

  const scopeId = new URLSearchParams(location.search).get("id");

  const loadScopeData = useCallback(async () => {
    if (!scopeId) {
      navigate(createPageUrl("scope-generator"));
      return;
    }
    setLoading(true);
    try {
      const scopeData = await Scope.get(scopeId);
      setScope(scopeData);
      
      const items = await ScopeItem.filter({ scopeId: scopeId }, 'order');
      setScopeItems(items);

      const briefData = await Brief.get(scopeData.briefId);
      setBrief(briefData);

      const projectData = await Project.get(briefData.projectId);
      setProject(projectData);

      const clientData = await Client.get(projectData.client_id);
      setClient(clientData);

      if (briefData?.id) {
        const briefVersions = await BriefingVersion.filter({ briefId: briefData.id }, "-created_date");
        setVersions(briefVersions);
      }
    } catch (error) {
      console.error("Erro ao carregar escopo ou versões:", error);
      toast.error("Erro ao carregar dados do escopo.");
      navigate(createPageUrl("scope-generator"));
    } finally {
      setLoading(false);
    }
  }, [scopeId, navigate]);

  useEffect(() => {
    loadScopeData();
  }, [loadScopeData]);

  const onDragEnd = useCallback(async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    let updatedItems = Array.from(scopeItems); // Create a shallow copy
    const [originalMovedItem] = updatedItems.splice(source.index, 1);
    let movedItem = { ...originalMovedItem }; // Create a new object for the moved item to ensure immutability when updating its type
    
    // Check if the item moved between droppables (e.g., changing type like from 'deliverables' to 'exclusions')
    if (source.droppableId !== destination.droppableId) {
      movedItem.type = destination.droppableId; // Assuming droppableId corresponds to item type
    }

    updatedItems.splice(destination.index, 0, movedItem);

    // Update order and persist. Recalculate order for all items in the new sequence.
    const updates = updatedItems.map((item, index) => ({
      id: item.id,
      updates: { order: index, type: item.type } // `item.type` is already correct after `movedItem.type` assignment
    }));
    
    // Optimistic UI update: apply new order and type to the local state
    setScopeItems(updatedItems.map((item, index) => ({...item, order: index}))); 
    
    try {
      // In a real scenario, a bulk update would be better.
      // For now, we update one by one.
      for (const update of updates) {
        await ScopeItem.update(update.id, update.updates);
      }
      toast.success("Ordem do escopo atualizada.");
    } catch (error) {
      console.error("Failed to update item order", error);
      toast.error("Falha ao atualizar a ordem dos itens.");
      loadScopeData(); // Revert on failure
    }
  }, [scopeItems, loadScopeData]);

  const handleUpdateItem = useCallback(async (itemId, newDescription) => {
    try {
      await ScopeItem.update(itemId, { description: newDescription });
      setScopeItems(prev => prev.map(item => item.id === itemId ? {...item, description: newDescription} : item));
      toast.success("Item atualizado.");
    } catch (error) {
       console.error("Failed to update item", error);
       toast.error("Falha ao atualizar o item.");
    }
  }, []);
  
  const handleAddItem = useCallback(async (type, description) => {
      if (!scope || !brief || !project) return;
      try {
          // Determine the order for the new item. Append to the end of all items.
          const newOrder = scopeItems.length > 0 ? Math.max(...scopeItems.map(item => item.order)) + 1 : 0;

          const newItem = await ScopeItem.create({
              agencyId: scope.agencyId,
              projectId: project.id,
              briefId: brief.id,
              scopeId: scope.id,
              type: type,
              description: description,
              order: newOrder
          });
          setScopeItems(prev => [...prev, newItem]);
          toast.success("Item adicionado com sucesso.");
      } catch (error) {
          console.error("Failed to add item", error);
          toast.error("Falha ao adicionar item ao escopo.");
      }
  }, [scope, brief, project, scopeItems]); // Depend on scopeItems to get correct max order

  const handleDeleteItem = useCallback(async (itemId) => {
      try {
          await ScopeItem.delete(itemId);
          setScopeItems(prev => prev.filter(item => item.id !== itemId));
          toast.success("Item removido com sucesso.");
      } catch (error) {
          console.error("Failed to delete item", error);
          toast.error("Falha ao remover o item.");
      }
  }, []);

  // Placeholder for save function, as the original button had no onClick.
  // This would typically save broader scope properties not managed by item-specific updates.
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Logic to save overall scope data (e.g., title, guardrails if they were editable)
      // For now, it just shows a success toast, as item changes are persisted individually.
      toast.success("Escopo salvo com sucesso.", { duration: 2000 });
    } catch (error) {
      console.error("Failed to save scope", error);
      toast.error("Falha ao salvar o escopo.");
    } finally {
      setIsSaving(false);
    }
  }, []); 

  // Placeholder for AI generation function, as the original button had no onClick.
  const handleGenerateAI = useCallback(() => {
    setIsGenerating(true);
    toast.info("A funcionalidade de geração por IA está em desenvolvimento.", { duration: 3000 });
    // Simulate AI generation process
    setTimeout(() => {
      setIsGenerating(false);
      // In a real scenario, this would trigger an AI service and update scope/items
    }, 1500);
  }, []);

  const handleGoBack = useCallback(() => {
    navigate(createPageUrl("scope-generator"));
  }, [navigate]);


  if (loading) {
    return <div className="flex justify-center items-center h-screen"><p>Carregando...</p></div>;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Replaced the original header div with the new ScopeHeader component */}
        {/* Render ScopeHeader only if essential data is loaded */}
        {scope && project && client && (
          <ScopeHeader
            scope={scope}
            project={project}
            client={client}
            onSave={handleSave}
            isSaving={isSaving}
            isGenerating={isGenerating}
            onGenerateAI={handleGenerateAI}
            onBack={handleGoBack}
          />
        )}

        {/* TitleGenerator and GuardrailsPanel remain as they are distinct sections below the main header */}
        {scope && <TitleGenerator scope={scope} setScope={setScope} isGenerating={isGenerating} setIsGenerating={setIsGenerating} />}
        {scope && <GuardrailsPanel guardrails={scope.guardrails || []} isGenerating={isGenerating} />}
        
        <ScopeCards
          scopeItems={scopeItems}
          onUpdateItem={handleUpdateItem}
          onAddItem={handleAddItem}
          onDeleteItem={handleDeleteItem}
        />

        {scope && <ApprovalFlow scope={scope} versions={versions} />}
      </div>
    </DragDropContext>
  );
}
