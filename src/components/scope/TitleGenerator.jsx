import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Edit3, Wand2, AlertTriangle, Brain, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';

export default function TitleGenerator({ 
  suggestions = [], 
  selectedTitle, 
  approvedTitle,
  approvedTitleEdited,
  onGenerate, 
  onSelectTitle, 
  onApproveTitle,
  isGenerating = false 
}) {
  const [editingTitle, setEditingTitle] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [wordCountWarning, setWordCountWarning] = useState(false);
  const [confirmLongTitle, setConfirmLongTitle] = useState(false);

  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleSelectForEdit = (title) => {
    setEditingTitle(title);
    setShowEditor(true);
    const wordCount = countWords(title);
    setWordCountWarning(wordCount > 7);
    setConfirmLongTitle(false);
  };

  const handleTitleEdit = (newTitle) => {
    setEditingTitle(newTitle);
    const wordCount = countWords(newTitle);
    setWordCountWarning(wordCount > 7);
    if (wordCount <= 7) {
      setConfirmLongTitle(false);
    }
  };

  const handleApprove = () => {
    const wordCount = countWords(editingTitle);
    
    // If more than 7 words and not confirmed, block
    if (wordCount > 7 && !confirmLongTitle) {
      return;
    }

    const wasEdited = editingTitle !== selectedTitle;
    onApproveTitle(editingTitle, wasEdited);
    setShowEditor(false);
    setEditingTitle('');
    setWordCountWarning(false);
    setConfirmLongTitle(false);
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingTitle('');
    setWordCountWarning(false);
    setConfirmLongTitle(false);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            Sugestões de Título
          </CardTitle>
          <Button 
            onClick={onGenerate} 
            disabled={isGenerating}
            variant="outline"
            size="sm"
          >
            {isGenerating ? (
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? "Gerando..." : "Gerar Novos"}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Current Approved Title */}
        {approvedTitle && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Título Aprovado</span>
              {approvedTitleEdited && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Editado
                </Badge>
              )}
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-900">{approvedTitle}</p>
              <p className="text-xs text-green-600 mt-1">
                {countWords(approvedTitle)} palavras
              </p>
            </div>
          </div>
        )}

        {/* Inline Editor */}
        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 border-2 border-blue-200 bg-blue-50/50 rounded-lg"
            >
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Editar Título Final
                  </label>
                  <Input
                    value={editingTitle}
                    onChange={(e) => handleTitleEdit(e.target.value)}
                    placeholder="Digite o título final..."
                    className="text-base"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {countWords(editingTitle)} palavras
                    {wordCountWarning && (
                      <span className="text-amber-600 ml-2">
                        (Recomendamos máximo 7 palavras)
                      </span>
                    )}
                  </p>
                </div>

                {wordCountWarning && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="text-amber-800 text-sm">
                          <strong>Título longo:</strong> Títulos com mais de 7 palavras podem ter menor impacto e serem cortados em algumas plataformas.
                        </p>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="confirm-long-title"
                            checked={confirmLongTitle}
                            onCheckedChange={setConfirmLongTitle}
                          />
                          <label 
                            htmlFor="confirm-long-title" 
                            className="text-sm text-amber-700 cursor-pointer"
                          >
                            Confirmo que desejo usar mais de 7 palavras
                          </label>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleApprove}
                    disabled={!editingTitle.trim() || (wordCountWarning && !confirmLongTitle)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Aprovar Título
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title Suggestions */}
        <div className="space-y-3" data-tutorial="title-cards">
          {suggestions.length > 0 ? (
            suggestions.map((title, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedTitle === title
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-purple-100 text-purple-700 text-xs">
                        <Brain className="w-3 h-3 mr-1" />
                        Sugestão de IA
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {countWords(title)} palavras
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 leading-relaxed">
                      {title}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {selectedTitle !== title && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectTitle(title)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        Selecionar
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      onClick={() => handleSelectForEdit(title)}
                      className="bg-green-600 hover:bg-green-700"
                      data-tutorial="select-title-button"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Definir como Título
                    </Button>
                  </div>
                </div>

                {selectedTitle === title && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Título Selecionado
                    </Badge>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Wand2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">Nenhuma sugestão ainda</p>
              <p className="text-xs">Clique em "Gerar Novos" para criar opções</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}