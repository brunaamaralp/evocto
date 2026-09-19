import { describe, it, expect } from 'vitest';
import {
  isContentApprovalTask,
  isClientActionTask,
  toContentApprovalDto,
} from '../clientPortalMvpDto.js';

describe('content approval portal DTO', () => {
  it('identifica conteúdo in_review visível', () => {
    expect(
      isContentApprovalTask({
        id: '1',
        clientVisible: true,
        status: 'in_review',
        type: 'creative',
      })
    ).toBe(true);
  });

  it('ignora client_action e tarefas ocultas', () => {
    expect(
      isContentApprovalTask({
        id: '1',
        clientVisible: true,
        status: 'in_review',
        type: 'client_action',
      })
    ).toBe(false);
    expect(
      isContentApprovalTask({
        id: '1',
        clientVisible: false,
        status: 'in_review',
        type: 'creative',
      })
    ).toBe(false);
    expect(
      isClientActionTask({
        id: '1',
        clientVisible: true,
        type: 'client_action',
      })
    ).toBe(true);
  });

  it('serializa anexos no DTO', () => {
    const dto = toContentApprovalDto({
      id: 't1',
      title: 'Reel X',
      clientVisible: true,
      status: 'in_review',
      type: 'creative',
      attachments: [
        { id: 'a1', name: '1.png', url: 'https://x/1.png', mimeType: 'image/png' },
        { name: 'bad', url: '' },
      ],
    });
    expect(dto).toMatchObject({
      id: 't1',
      kind: 'content',
      contentType: 'content_task',
      canDecide: true,
    });
    expect(dto.attachments).toHaveLength(1);
    expect(dto.attachments[0].name).toBe('1.png');
  });
});
