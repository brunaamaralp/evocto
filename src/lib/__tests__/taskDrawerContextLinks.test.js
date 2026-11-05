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
  });

  it('includes service workspace when serviceId is present', () => {
    const links = buildTaskDrawerContextLinks({
      clientId: 'c1',
      serviceId: 's1',
      briefingId: 'b1',
    });
    expect(links.service?.href).toContain('delivery-workspace');
    expect(links.service?.href).toContain('serviceId=s1');
    expect(links.campaign).toBeUndefined();
    expect(listTaskDrawerContextLinks({
      clientId: 'c1',
      serviceId: 's1',
    })).toHaveLength(3);
  });

  it('returns empty list without client', () => {
    expect(listTaskDrawerContextLinks({})).toEqual([]);
    expect(listTaskDrawerContextLinks(null)).toEqual([]);
  });
});
