import { describe, expect, it } from 'vitest';
import {
  buildLeadPatch,
  parseMoney,
  parseProbability,
  validateLeadPatch,
  weightedLeadValue,
  whatsappHref,
  withStageHistory,
} from '../agencyLeads/leadFields.js';
import {
  computeLeadFollowUp,
  groupTasksByLead,
  sortLeadTasks,
  sortTimeline,
  taskDueState,
} from '../agencyLeads/followUp.js';

const NOW = new Date('2026-03-10T12:00:00Z');
const hoursFrom = (h) => new Date(NOW.getTime() + h * 3600000).toISOString();
const daysAgo = (d) => new Date(NOW.getTime() - d * 86400000).toISOString();

describe('leadFields', () => {
  it('parses BR and plain money', () => {
    expect(parseMoney('1.500,50')).toBe(1500.5);
    expect(parseMoney('R$ 2.000')).toBe(2000);
    expect(parseMoney('1500.5')).toBe(1500.5);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });

  it('clamps probability', () => {
    expect(parseProbability('120')).toBe(100);
    expect(parseProbability('35%')).toBe(35);
    expect(parseProbability('')).toBeNull();
  });

  it('builds partial patch only with given keys', () => {
    const patch = buildLeadPatch({ name: '  Ana ', email: 'ANA@X.COM', quotedValue: '3.000' });
    expect(patch).toEqual({ name: 'Ana', email: 'ana@x.com', quotedValue: 3000 });
    expect(buildLeadPatch({ companyName: '' })).toEqual({ companyName: null });
  });

  it('validates required name and email format', () => {
    expect(validateLeadPatch({ name: null })).toMatch(/nome/i);
    expect(validateLeadPatch({ email: 'x@' })).toMatch(/e-mail/i);
    expect(validateLeadPatch({ email: 'a@b.co' })).toBeNull();
  });

  it('weights value by probability, preferring quoted value', () => {
    expect(weightedLeadValue({ estimatedValue: 1000, probability: 50 })).toBe(500);
    expect(weightedLeadValue({ estimatedValue: 1000, quotedValue: 2000, probability: 25 })).toBe(500);
    expect(weightedLeadValue({ estimatedValue: 1000 })).toBe(1000);
  });

  it('builds WhatsApp link with BR country code', () => {
    expect(whatsappHref({ phone: '(11) 98888-7777' })).toBe('https://wa.me/5511988887777');
    expect(whatsappHref({ whatsapp: '+351 912 345 678' })).toBe('https://wa.me/351912345678');
    expect(whatsappHref({})).toBeNull();
  });

  it('appends stage history only on change', () => {
    const lead = { status: 'lead', stageHistory: [] };
    expect(withStageHistory(lead, { name: 'x' })).toEqual({ name: 'x' });
    expect(withStageHistory(lead, { status: 'lead' })).toEqual({ status: 'lead' });
    const p = withStageHistory(lead, { status: 'proposta' }, { id: 'u1' }, NOW);
    expect(p.stageHistory).toEqual([
      { from: 'lead', to: 'proposta', at: NOW.toISOString(), by: 'u1', byName: null },
    ]);
  });
});

describe('computeLeadFollowUp', () => {
  const lead = { status: 'qualificacao', created_date: daysAgo(2) };

  it('flags overdue tasks', () => {
    const r = computeLeadFollowUp(lead, [{ status: 'todo', dueDate: hoursFrom(-3) }], NOW);
    expect(r.state).toBe('overdue');
    expect(r.tone).toBe('danger');
    expect(r.overdueCount).toBe(1);
  });

  it('flags due soon within 48h', () => {
    const r = computeLeadFollowUp(lead, [{ status: 'todo', dueDate: hoursFrom(20) }], NOW);
    expect(r.state).toBe('due_soon');
  });

  it('scheduled when next task is far', () => {
    const r = computeLeadFollowUp(lead, [{ status: 'todo', dueDate: hoursFrom(24 * 5), title: 'Ligar' }], NOW);
    expect(r.state).toBe('scheduled');
    expect(r.nextTask.title).toBe('Ligar');
  });

  it('ignores completed tasks', () => {
    const r = computeLeadFollowUp(lead, [{ status: 'completed', dueDate: hoursFrom(-3) }], NOW);
    expect(r.state).toBe('no_next_step');
  });

  it('stale when no contact for 7+ days and nothing scheduled', () => {
    const r = computeLeadFollowUp({ status: 'lead', lastInteractionAt: daysAgo(9) }, [], NOW);
    expect(r.state).toBe('stale');
    expect(r.label).toMatch(/9 dias/);
  });

  it('closed leads have no follow-up signal', () => {
    const r = computeLeadFollowUp({ status: 'fechado' }, [{ status: 'todo', dueDate: hoursFrom(-3) }], NOW);
    expect(r.state).toBe('closed');
    expect(r.label).toBe('');
  });
});

describe('followUp helpers', () => {
  it('groups tasks by leadId', () => {
    const m = groupTasksByLead([{ leadId: 'a' }, { leadId: 'b' }, { leadId: 'a' }, { title: 'x' }]);
    expect(m.get('a')).toHaveLength(2);
    expect(m.has('')).toBe(false);
  });

  it('sorts timeline newest first', () => {
    const out = sortTimeline([
      { id: 1, occurredAt: daysAgo(3) },
      { id: 2, occurredAt: daysAgo(1) },
      { id: 3, created_date: daysAgo(2) },
    ]);
    expect(out.map((x) => x.id)).toEqual([2, 3, 1]);
  });

  it('sorts open tasks by due date before done ones', () => {
    const out = sortLeadTasks([
      { id: 'done', status: 'completed', dueDate: hoursFrom(-100) },
      { id: 'later', status: 'todo', dueDate: hoursFrom(50) },
      { id: 'nodate', status: 'todo' },
      { id: 'soon', status: 'todo', dueDate: hoursFrom(1) },
    ]);
    expect(out.map((x) => x.id)).toEqual(['soon', 'later', 'nodate', 'done']);
  });

  it('task due state', () => {
    expect(taskDueState({ status: 'todo', dueDate: hoursFrom(-1) }, NOW)).toBe('overdue');
    expect(taskDueState({ status: 'todo' }, NOW)).toBe('none');
    expect(taskDueState({ status: 'done' }, NOW)).toBe('done');
  });
});
