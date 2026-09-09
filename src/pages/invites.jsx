import React from 'react';
import InvitesPanel from '@/components/team/InvitesPanel';
import { getModulePastel } from '@/lib/modulePastels';

export default function InvitesPage() {
  const pastel = getModulePastel('team');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#18162A]">Gerenciar Convites</h1>
        <p className="text-[#7A7595] mt-1">Liste, reenvie e revogue convites pendentes da sua agência.</p>
      </div>
      <div className={`rounded-2xl ${pastel.soft}`}>
        <InvitesPanel />
      </div>
    </div>
  );
}
