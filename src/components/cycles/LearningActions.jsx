import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookCopy, FileText, GitBranchPlus, Rocket } from 'lucide-react';

export default function LearningActions({ results, onConfirm }) {
  const [decisions, setDecisions] = useState({});

  const handleDecisionChange = (learningId, action, value) => {
    setDecisions(prev => ({
      ...prev,
      [learningId]: {
        ...prev[learningId],
        [action]: value
      }
    }));
  };

  const handleSubmit = () => {
    onConfirm(decisions);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. Ações de Aprendizado</CardTitle>
        <CardDescription>
          Decida o que fazer com os aprendizados sugeridos pela IA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {results.suggestedLearnings.map(learning => (
          <div key={learning.id} className="p-4 border rounded-lg">
            <p className="font-semibold">{learning.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">Score: {learning.score}</Badge>
              <Badge variant="outline">Origem: {learning.origin}</Badge>
            </div>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`plan-${learning.id}`} 
                  onCheckedChange={(checked) => handleDecisionChange(learning.id, 'addToPlan', checked)}
                />
                <Label htmlFor={`plan-${learning.id}`} className="flex items-center gap-1.5 text-sm">
                  <BookCopy className="w-4 h-4"/> Adicionar ao Próximo Plano
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`brief-${learning.id}`}
                  onCheckedChange={(checked) => handleDecisionChange(learning.id, 'proposeToBriefing', checked)}
                />
                <Label htmlFor={`brief-${learning.id}`} className="flex items-center gap-1.5 text-sm">
                  <FileText className="w-4 h-4"/> Propor Atualização ao Briefing
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`playbook-${learning.id}`}
                  onCheckedChange={(checked) => handleDecisionChange(learning.id, 'promoteToPlaybook', checked)}
                />
                <Label htmlFor={`playbook-${learning.id}`} className="flex items-center gap-1.5 text-sm">
                  <Rocket className="w-4 h-4"/> Promover a Playbook
                </Label>
              </div>
            </div>
          </div>
        ))}
        <Button onClick={handleSubmit} className="w-full">
          Confirmar Ações
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}