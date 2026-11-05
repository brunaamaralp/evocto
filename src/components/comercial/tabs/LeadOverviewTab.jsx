import { Building2, FileText, Megaphone, UserRound } from 'lucide-react';
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  labelFrom,
  normalizeLeadStage,
} from '@/lib/agencyLeads/constants';
import { leadEnteredAt } from '@/lib/agencyLeads/leadFields';
import { EditableSection } from '../LeadShared';
import { formatDate, memberName } from '../leadUi';

export default function LeadOverviewTab({ lead, members, onSave, canEdit }) {
  return (
    <div className="space-y-3">
      <EditableSection
        title="Contato"
        icon={UserRound}
        lead={lead}
        members={members}
        onSave={onSave}
        canEdit={canEdit}
        fields={[
          { key: 'name', label: 'Nome completo', required: true },
          { key: 'jobTitle', label: 'Cargo / função' },
          { key: 'phone', label: 'Telefone', type: 'tel' },
          { key: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: 'Se diferente do telefone' },
          { key: 'email', label: 'E-mail', type: 'email', full: true },
        ]}
      />

      <EditableSection
        title="Empresa e interesse"
        icon={Building2}
        lead={lead}
        members={members}
        onSave={onSave}
        canEdit={canEdit}
        fields={[
          { key: 'companyName', label: 'Empresa / organização' },
          { key: 'serviceInterest', label: 'Serviço ou produto de interesse' },
        ]}
      />

      <EditableSection
        title="Origem e atendimento"
        icon={Megaphone}
        lead={lead}
        members={members}
        onSave={onSave}
        canEdit={canEdit}
        fields={[
          {
            key: 'source',
            label: 'Origem do lead',
            type: 'select',
            options: LEAD_SOURCES,
            render: (l) => labelFrom(LEAD_SOURCE_LABELS, l.source),
          },
          { key: 'campaign', label: 'Campanha de origem' },
          {
            key: 'ownerId',
            label: 'Responsável',
            type: 'member',
            render: (l) => memberName(members, l.ownerId),
          },
          {
            key: 'status',
            label: 'Status no pipeline',
            type: 'select',
            required: true,
            options: LEAD_STAGES,
            render: (l) => LEAD_STAGE_LABELS[normalizeLeadStage(l.status)],
          },
          {
            key: 'enteredAt',
            label: 'Entrada no CRM',
            type: 'date',
            render: (l) => formatDate(leadEnteredAt(l)),
          },
        ]}
      />

      <EditableSection
        title="Contexto da oportunidade"
        icon={FileText}
        lead={lead}
        members={members}
        onSave={onSave}
        canEdit={canEdit}
        fields={[
          {
            key: 'notes',
            label: 'Resumo',
            type: 'textarea',
            placeholder: 'Quem é, o que precisa, dores e objetivos…',
          },
        ]}
      />
    </div>
  );
}
