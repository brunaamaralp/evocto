import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitMerge, GitPullRequest } from 'lucide-react';

export default function BriefingUpdateProposals({ proposals }) {
  if (!proposals || proposals.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>4. Propostas de Atualização para o Briefing Mestre</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {proposals.map((proposal, i) => (
          <div key={i} className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{proposal.section}</div>
              <Badge variant={proposal.type === 'aditivo' ? 'default' : 'destructive'} className="capitalize">
                {proposal.type === 'aditivo' ? <GitMerge className="w-3 h-3 mr-1.5" /> : <GitPullRequest className="w-3 h-3 mr-1.5" />}
                {proposal.type}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1">"{proposal.change}"</p>
            {proposal.evidence && <p className="text-xs text-slate-500 mt-1">Evidência: {proposal.evidence}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}