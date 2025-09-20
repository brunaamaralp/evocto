import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Save, 
  Edit3, 
  Check, 
  X, 
  User, 
  AlertTriangle, 
  Shield, 
  MessageCircle, 
  Target,
  Plus,
  Trash2,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EditableCard = ({ 
  title, 
  icon: Icon, 
  value, 
  onSave, 
  type = "text", 
  placeholder = "", 
  color = "blue",
  isGenerating = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [items, setItems] = useState(Array.isArray(value) ? value : []);

  useEffect(() => {
    setEditValue(value);
    if (Array.isArray(value)) {
      setItems(value);
    }
  }, [value]);

  const handleSave = () => {
    if (type === "array") {
      onSave(items.filter(item => item.trim() !== ""));
    } else {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setItems(Array.isArray(value) ? value : []);
    setIsEditing(false);
  };

  const addItem = () => {
    setItems([...items, ""]);
  };

  const updateItem = (index, newValue) => {
    const newItems = [...items];
    newItems[index] = newValue;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const colorClasses = {
    blue: "border-blue-200 bg-blue-50/50",
    green: "border-green-200 bg-green-50/50", 
    amber: "border-amber-200 bg-amber-50/50",
    purple: "border-purple-200 bg-purple-50/50",
    red: "border-red-200 bg-red-50/50"
  };

  const iconColors = {
    blue: "text-blue-600",
    green: "text-green-600",
    amber: "text-amber-600", 
    purple: "text-purple-600",
    red: "text-red-600"
  };

  return (
    <Card className={`${colorClasses[color]} border-2 transition-all duration-200`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className={`w-5 h-5 ${iconColors[color]}`} />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {(value || (Array.isArray(value) && value.length > 0)) && (
              <Badge variant="outline" className="text-xs">
                {Array.isArray(value) ? `${value.length} itens` : 'Preenchido'}
              </Badge>
            )}
            {!isEditing ? (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isGenerating}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleSave}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8"
            >
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                <p className="text-sm text-slate-600">Gerando...</p>
              </div>
            </motion.div>
          ) : !isEditing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {type === "array" ? (
                <div className="space-y-2">
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                        <span className="flex-1 text-sm">{item}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm italic">Nenhum item adicionado</p>
                  )}
                </div>
              ) : (
                <p className="text-sm leading-relaxed">
                  {value || <span className="text-slate-500 italic">Não preenchido</span>}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {type === "array" ? (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => updateItem(index, e.target.value)}
                        placeholder={`${placeholder} ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
              ) : (
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={placeholder}
                  rows={4}
                  className="w-full"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default function InsightsCards({ insights, onSave, isGenerating, isSaving }) {
  const [insightsData, setInsightsData] = useState(insights);
  const [manualEdits, setManualEdits] = useState(insights.manual_edits || {});

  useEffect(() => {
    setInsightsData(insights);
    setManualEdits(insights.manual_edits || {});
  }, [insights]);

  const handleFieldSave = (field, value) => {
    const updatedInsights = { ...insightsData, [field]: value };
    const updatedManualEdits = { ...manualEdits, [field]: true };
    
    setInsightsData(updatedInsights);
    setManualEdits(updatedManualEdits);
    
    // Auto-save individual field
    onSave({ 
      ...updatedInsights, 
      manual_edits: updatedManualEdits 
    });
  };

  const hasContent = insightsData.persona || 
                   (insightsData.dores && insightsData.dores.length > 0) ||
                   (insightsData.objecoes && insightsData.objecoes.length > 0) ||
                   insightsData.tom_de_voz ||
                   (insightsData.claims_de_risco && insightsData.claims_de_risco.length > 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Insights Estratégicos</h2>
        <p className="text-slate-600">
          {hasContent 
            ? "Revise e edite os insights conforme necessário"
            : "Use o botão 'Gerar Insights' para começar a análise"
          }
        </p>
        {insightsData.confidence_score && (
          <Badge className="mt-2 bg-purple-100 text-purple-700">
            Confiança: {insightsData.confidence_score}%
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <EditableCard
            title="Persona Principal"
            icon={User}
            value={insightsData.persona || ""}
            onSave={(value) => handleFieldSave("persona", value)}
            placeholder="Descreva a persona principal: quem é, contexto e motivadores..."
            color="blue"
            isGenerating={isGenerating}
          />

          <EditableCard
            title="Dores e Necessidades"
            icon={Target}
            value={insightsData.dores || []}
            onSave={(value) => handleFieldSave("dores", value)}
            type="array"
            placeholder="Dor específica"
            color="amber"
            isGenerating={isGenerating}
          />

          <EditableCard
            title="Claims de Risco"
            icon={Shield}
            value={insightsData.claims_de_risco || []}
            onSave={(value) => handleFieldSave("claims_de_risco", value)}
            type="array"
            placeholder="Promessa perigosa"
            color="red"
            isGenerating={isGenerating}
          />
        </div>

        <div className="space-y-6">
          <EditableCard
            title="Objeções Comuns"
            icon={AlertTriangle}
            value={insightsData.objecoes || []}
            onSave={(value) => handleFieldSave("objecoes", value)}
            type="array"
            placeholder="Objeção provável"
            color="green"
            isGenerating={isGenerating}
          />

          <EditableCard
            title="Tom de Voz Recomendado"
            icon={MessageCircle}
            value={insightsData.tom_de_voz || ""}
            onSave={(value) => handleFieldSave("tom_de_voz", value)}
            placeholder="Ex: claro e direto, acolhedor e empático, técnico mas acessível..."
            color="purple"
            isGenerating={isGenerating}
          />
        </div>
      </div>

      {hasContent && (
        <div className="text-center pt-6 border-t">
          <p className="text-sm text-slate-600 mb-4">
            💡 <strong>Próximo passo:</strong> Use estes insights para definir o escopo do projeto
          </p>
          <Button className="bg-green-600 hover:bg-green-700">
            Continuar para Escopo →
          </Button>
        </div>
      )}
    </div>
  );
}