/**
 * Perfil completo do lead em painel lateral (/comercial?lead=<id>).
 * Abas: Visão geral · Histórico · Atividades · Negócio · Notas · Arquivos.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import ContactAvatar from '@/components/shared/ContactAvatar';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import {
  LEAD_SOURCE_LABELS,
  LEAD_STAGES,
  formatLeadValue,
  labelFrom,
  normalizeLeadStage,
} from '@/lib/agencyLeads/constants';
import { emailHref, leadPrimaryValue, phoneHref, whatsappHref } from '@/lib/agencyLeads/leadFields';
import { computeLeadFollowUp, isLeadTaskOpen, sortTimeline } from '@/lib/agencyLeads/followUp';
import {
  ACTIVITY_KINDS,
  createInteraction,
  createLeadTask,
  createNote,
  deleteActivity,
  deleteLeadAttachment,
  deleteLeadTask,
  isSchemaMissingError,
  listLeadActivities,
  listLeadTasks,
  setLeadTaskDone,
  updateActivity,
  updateLeadTask,
  uploadLeadAttachment,
} from '@/lib/agencyLeads/leadCrmApi';
import { FollowUpBadge } from './LeadShared';
import { formatAgo, leadDisplayName, memberName } from './leadUi';
import LeadOverviewTab from './tabs/LeadOverviewTab';
import LeadTimelineTab from './tabs/LeadTimelineTab';
import LeadTasksTab from './tabs/LeadTasksTab';
import LeadDealTab from './tabs/LeadDealTab';
import LeadNotesTab from './tabs/LeadNotesTab';
import LeadFilesTab from './tabs/LeadFilesTab';

function QuickAction({ href, icon: Icon, label, external = false }) {
  if (!href) {
    return (
      <Button type="button" variant="outline" size="sm" className="h-8 border-[#E4DDD4] text-xs" disabled title={`${label}: não informado`}>
        <Icon className="mr-1.5 h-3.5 w-3.5" />
        {label}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="sm" className="h-8 border-[#E4DDD4] text-xs hover:border-[#B80015] hover:text-[#B80015]">
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
        <Icon className="mr-1.5 h-3.5 w-3.5" />
        {label}
      </a>
    </Button>
  );
}

function errorState(err) {
  if (!err) return { message: null, schemaMissing: false };
  return { message: err?.message || 'Erro ao carregar', schemaMissing: isSchemaMissingError(err) };
}

export default function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  members,
  agencyId,
  user,
  isAdmin,
  onSaveLead,
  onLeadPatched,
  onTasksChanged,
  pipelineTasks,
  onGenerateProposal,
  onConvert,
  canGenerateProposal,
  canConvert,
  generating,
  converting,
}) {
  const leadId = lead?.id || null;
  const [tab, setTab] = useState('overview');
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [activitiesError, setActivitiesError] = useState(null);
  const [tasksError, setTasksError] = useState(null);
  /** leadId cujas tarefas estão em `tasks` (evita sincronizar dados do lead anterior). */
  const tasksLoadedFor = useRef(null);

  const loadActivities = useCallback(async () => {
    if (!leadId || !agencyId) return;
    setLoadingActivities(true);
    setActivitiesError(null);
    try {
      setActivities(await listLeadActivities({ agencyId, leadId }));
    } catch (err) {
      console.error('[comercial] activities load failed:', err);
      setActivitiesError(err);
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, [agencyId, leadId]);

  const loadTasks = useCallback(async () => {
    if (!leadId || !agencyId) return;
    setLoadingTasks(true);
    setTasksError(null);
    tasksLoadedFor.current = null;
    try {
      const rows = await listLeadTasks({ agencyId, leadId });
      tasksLoadedFor.current = leadId;
      setTasks(rows);
    } catch (err) {
      console.error('[comercial] tasks load failed:', err);
      setTasksError(err);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [agencyId, leadId]);

  useEffect(() => {
    if (!open || !leadId) return;
    setTab('overview');
    setActivities([]);
    setTasks([]);
    loadActivities();
    loadTasks();
  }, [open, leadId, loadActivities, loadTasks]);

  // Mantém os indicadores do pipeline em sincronia com as tarefas do lead.
  useEffect(() => {
    if (!open || !leadId || loadingTasks || tasksError) return;
    if (tasksLoadedFor.current !== leadId) return;
    onTasksChanged?.(leadId, tasks);
  }, [open, leadId, tasks, loadingTasks, tasksError, onTasksChanged]);

  const setTasksAndNotify = setTasks;

  const interactions = useMemo(
    () => sortTimeline(activities.filter((a) => a.kind === ACTIVITY_KINDS.INTERACTION)),
    [activities]
  );
  const notes = useMemo(() => sortTimeline(activities.filter((a) => a.kind === ACTIVITY_KINDS.NOTE)), [activities]);
  const files = useMemo(() => sortTimeline(activities.filter((a) => a.kind === ACTIVITY_KINDS.ATTACHMENT)), [activities]);
  const openTasks = useMemo(() => tasks.filter(isLeadTaskOpen), [tasks]);
  const tasksReady = !loadingTasks && tasksLoadedFor.current === leadId;
  const followUp = useMemo(
    () => (lead ? computeLeadFollowUp(lead, tasksReady ? tasks : pipelineTasks || []) : null),
    [lead, tasks, tasksReady, pipelineTasks]
  );

  if (!lead) return null;

  const ctx = { agencyId, user, lead };
  const actErr = errorState(activitiesError);
  const taskErr = errorState(tasksError);
  const stage = normalizeLeadStage(lead.status);
  const value = leadPrimaryValue(lead);
  const owner = memberName(members, lead.ownerId);
  const subtitle = [lead.companyName ? lead.name : null, lead.jobTitle].filter(Boolean).join(' · ');

  const tabTrigger = (id, label, count) => (
    <TabsTrigger
      value={id}
      className="shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:text-[#B80015] sm:text-sm"
    >
      {label}
      {count ? (
        <span className="rounded-full bg-[#F1EDE7] px-1.5 text-[10px] tabular-nums text-[#6B635C]">{count}</span>
      ) : null}
    </TabsTrigger>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-[#FBFAF8] p-0 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] sm:max-w-2xl"
      >
        <header className="border-b border-[#E4DDD4] bg-white px-4 pb-3 pt-4 sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <ContactAvatar contact={{ name: lead.name || lead.companyName }} size={44} />
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-lg font-bold leading-tight text-[#1A1210]">
                {leadDisplayName(lead)}
              </SheetTitle>
              <SheetDescription className="truncate text-xs text-[#6B635C]">
                {subtitle || (lead.serviceInterest ? `Interesse: ${lead.serviceInterest}` : 'Perfil do lead')}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <FollowUpBadge followUp={followUp} />
                {value ? (
                  <span className="rounded-full bg-[#FFF5F5] px-2 py-0.5 text-[11px] font-semibold text-[#B80015]">
                    {formatLeadValue(value)}
                  </span>
                ) : null}
                {lead.source ? (
                  <span className="rounded-full border border-[#E4DDD4] px-2 py-0.5 text-[11px] text-[#6B635C]">
                    {labelFrom(LEAD_SOURCE_LABELS, lead.source)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={stage} onValueChange={(v) => onSaveLead({ status: v }).catch(() => {})}>
              <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Estágio no pipeline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <QuickAction href={whatsappHref(lead)} icon={MessageCircle} label="WhatsApp" external />
            <QuickAction href={phoneHref(lead)} icon={Phone} label="Ligar" />
            <QuickAction href={emailHref(lead)} icon={Mail} label="E-mail" />
          </div>

          <p className="mt-2 text-[11px] text-[#9A9088]">
            {[
              owner ? `Responsável: ${owner}` : 'Sem responsável',
              lead.lastInteractionAt ? `Último contato ${formatAgo(lead.lastInteractionAt)}` : 'Nenhum contato registrado',
            ].join(' · ')}
            {lead.convertedClientId ? (
              <>
                {' · '}
                <Link
                  to={createPageUrl(`client-detail?clientId=${lead.convertedClientId}`)}
                  className="inline-flex items-center font-medium text-[#B80015] hover:underline"
                >
                  Abrir cliente <ArrowRight className="ml-0.5 h-3 w-3" />
                </Link>
              </>
            ) : null}
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-[#E4DDD4] bg-white px-2 sm:px-4">
            <TabsList className="h-10 w-full justify-start gap-0.5 overflow-x-auto rounded-none bg-transparent p-0 [scrollbar-width:none]">
              {tabTrigger('overview', 'Visão geral')}
              {tabTrigger('timeline', 'Histórico', interactions.length)}
              {tabTrigger('tasks', 'Atividades', openTasks.length)}
              {tabTrigger('deal', 'Negócio')}
              {tabTrigger('notes', 'Notas', notes.length)}
              {tabTrigger('files', 'Arquivos', files.length)}
            </TabsList>
          </div>

          <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6')}>
            <TabsContent value="overview" className="mt-0">
              <LeadOverviewTab lead={lead} members={members} onSave={onSaveLead} canEdit />
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              <LeadTimelineTab
                lead={lead}
                items={interactions}
                loading={loadingActivities}
                error={actErr.message}
                schemaMissing={actErr.schemaMissing}
                onRetry={loadActivities}
                members={members}
                user={user}
                isAdmin={isAdmin}
                onCreate={async (form) => {
                  const res = await createInteraction({ ...ctx, data: form });
                  setActivities((prev) => [res.activity, ...prev]);
                  if (res.lead) onLeadPatched?.(res.lead);
                  if (res.followUp) setTasksAndNotify((prev) => [res.followUp, ...prev]);
                  return res;
                }}
                onUpdate={async (item, patch) => {
                  const saved = await updateActivity(item.id, patch);
                  setActivities((prev) => prev.map((a) => (a.id === item.id ? saved : a)));
                }}
                onDelete={async (item) => {
                  await deleteActivity(item.id);
                  setActivities((prev) => prev.filter((a) => a.id !== item.id));
                }}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <LeadTasksTab
                tasks={tasks}
                loading={loadingTasks}
                error={taskErr.message}
                schemaMissing={taskErr.schemaMissing}
                onRetry={loadTasks}
                members={members}
                user={user}
                isAdmin={isAdmin}
                onCreate={async (form) => {
                  const created = await createLeadTask({ ...ctx, data: form });
                  setTasksAndNotify((prev) => [created, ...prev]);
                }}
                onUpdate={async (task, form) => {
                  const saved = await updateLeadTask(task.id, {
                    title: form.title,
                    dueDate: form.dueDate,
                    assigneeId: form.assigneeId || null,
                    description: form.description?.trim() || null,
                    leadTaskType: form.leadTaskType,
                  });
                  setTasksAndNotify((prev) => prev.map((t) => (t.id === task.id ? saved : t)));
                }}
                onToggleDone={async (task, done) => {
                  const saved = await setLeadTaskDone(task, done, { agencyId, user });
                  setTasksAndNotify((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...saved } : t)));
                }}
                onDelete={async (task) => {
                  await deleteLeadTask(task.id);
                  setTasksAndNotify((prev) => prev.filter((t) => t.id !== task.id));
                }}
              />
            </TabsContent>

            <TabsContent value="deal" className="mt-0">
              <LeadDealTab
                lead={lead}
                members={members}
                onSave={onSaveLead}
                canEdit
                onGenerateProposal={onGenerateProposal}
                onConvert={onConvert}
                canGenerateProposal={canGenerateProposal}
                canConvert={canConvert}
                generating={generating}
                converting={converting}
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <LeadNotesTab
                notes={notes}
                loading={loadingActivities}
                error={actErr.message}
                schemaMissing={actErr.schemaMissing}
                onRetry={loadActivities}
                user={user}
                isAdmin={isAdmin}
                onCreate={async (body) => {
                  const created = await createNote({ ...ctx, body });
                  setActivities((prev) => [created, ...prev]);
                }}
                onUpdate={async (note, patch) => {
                  const saved = await updateActivity(note.id, patch);
                  setActivities((prev) => prev.map((a) => (a.id === note.id ? saved : a)));
                }}
                onDelete={async (note) => {
                  await deleteActivity(note.id);
                  setActivities((prev) => prev.filter((a) => a.id !== note.id));
                }}
              />
            </TabsContent>

            <TabsContent value="files" className="mt-0">
              <LeadFilesTab
                files={files}
                loading={loadingActivities}
                error={actErr.message}
                schemaMissing={actErr.schemaMissing}
                onRetry={loadActivities}
                user={user}
                isAdmin={isAdmin}
                onUpload={async (file, category) => {
                  const created = await uploadLeadAttachment({ ...ctx, file, category });
                  setActivities((prev) => [created, ...prev]);
                }}
                onDelete={async (item) => {
                  await deleteLeadAttachment(item);
                  setActivities((prev) => prev.filter((a) => a.id !== item.id));
                }}
              />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
