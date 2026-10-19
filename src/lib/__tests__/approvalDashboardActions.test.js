import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadApprovalPdf } from '../approvalDashboardActions.js';

describe('downloadApprovalPdf', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });

  it('opens pdfUrl when present', () => {
    expect(downloadApprovalPdf({ pdfUrl: 'https://example.com/a.pdf' })).toBe(
      'opened'
    );
    expect(window.open).toHaveBeenCalled();
  });

  it('returns missing without url', () => {
    expect(downloadApprovalPdf({})).toBe('missing');
    expect(window.open).not.toHaveBeenCalled();
  });
});
