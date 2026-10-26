import { describe, it, expect } from 'vitest';
import { toPortalTaskDto } from '../clientPortalDto.js';
import { toContentApprovalDto } from '../clientPortalMvpDto.js';

describe('portal DTOs hide internal attachments', () => {
  const task = {
    id: 't1',
    title: 'Post',
    status: 'in_review',
    clientVisible: true,
    type: 'content',
    attachments: [
      { id: 'a1', name: 'interno', url: 'https://x/a1', visibility: 'internal' },
      { id: 'a2', name: 'cliente', url: 'https://x/a2', visibility: 'client' },
      { id: 'a3', name: 'default', url: 'https://x/a3' },
    ],
  };

  it('toPortalTaskDto omits visibility=internal', () => {
    const dto = toPortalTaskDto(task);
    expect(dto.attachments.map((a) => a.id)).toEqual(['a2', 'a3']);
  });

  it('toContentApprovalDto omits visibility=internal', () => {
    const dto = toContentApprovalDto(task);
    expect(dto).not.toBeNull();
    expect(dto.attachments.map((a) => a.id)).toEqual(['a2', 'a3']);
  });
});
