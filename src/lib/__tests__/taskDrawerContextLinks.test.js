import { describe, it, expect } from 'vitest';
import {
  buildTaskDrawerContextLinks,
  listTaskDrawerContextLinks,
} from '../taskDrawerContextLinks.js';

describe('taskDrawerContextLinks', () => {
  it('builds client + documents when only clientId is set', () => {
    const links = buildTaskDrawerContextLinks({ clientId: 'c1' });
    expect(links.client?.href).toMatch(/client/);
    expect(links.client?.href).toContain('c1');
    expect(links.documents?.href).toContain('client-documents');
    expect(links.documents?.href).toContain('clientId=c1');
    expect(links.service).toBeNull();
    expect(links.campaign).toBeNull();
  });

  it('includes service and campaign when ids are present', () => {
    const links = buildTaskDrawerContextLinks({
      clientId: 'c1',
      serviceId: 's1',
      briefingId: 'b1',
      cycleId: 'cy1',
    });
    expect(links.service?.href).toContain('serviceId=s1');
    expect(links.campaign?.href).toMatch(/delivery-workspace|section=tasks/);
    expect(links.campaign?.href).toContain('b1');
    expect(listTaskDrawerContextLinks({
      clientId: 'c1',
      serviceId: 's1',
      briefingId: 'b1',
    }).length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty list without client', () => {
    expect(listTaskDrawerContextLinks({})).toEqual([]);
    expect(listTaskDrawerContextLinks(null)).toEqual([]);
  });
});
