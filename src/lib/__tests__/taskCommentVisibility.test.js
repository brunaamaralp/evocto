import { describe, it, expect } from 'vitest';
import {
  COMMENT_VISIBILITY,
  filterCommentsForClient,
  getCommentVisibility,
  withCommentVisibility,
} from '../taskCommentVisibility.js';

describe('taskCommentVisibility', () => {
  it('defaults to internal (staff-only)', () => {
    expect(getCommentVisibility({})).toBe(COMMENT_VISIBILITY.INTERNAL);
    expect(getCommentVisibility({ content: 'hi' })).toBe(
      COMMENT_VISIBILITY.INTERNAL
    );
  });

  it('honors visibility and legacy clientVisible', () => {
    expect(
      getCommentVisibility({ visibility: 'client' })
    ).toBe(COMMENT_VISIBILITY.CLIENT);
    expect(
      getCommentVisibility({ clientVisible: true })
    ).toBe(COMMENT_VISIBILITY.CLIENT);
    expect(
      getCommentVisibility({ visibility: 'internal', clientVisible: true })
    ).toBe(COMMENT_VISIBILITY.INTERNAL);
  });

  it('withCommentVisibility dual-writes mirror flag', () => {
    const c = withCommentVisibility({ id: '1', content: 'x' }, 'client');
    expect(c.visibility).toBe('client');
    expect(c.clientVisible).toBe(true);
    const i = withCommentVisibility({ id: '2' }, 'internal');
    expect(i.visibility).toBe('internal');
    expect(i.clientVisible).toBe(false);
  });

  it('filterCommentsForClient hides internal and system', () => {
    const list = [
      { id: '1', type: 'comment', visibility: 'internal', content: 'priv' },
      { id: '2', type: 'comment', visibility: 'client', content: 'pub' },
      { id: '3', type: 'system', visibility: 'client', content: 'sys' },
      { id: '4', type: 'comment', clientVisible: true, content: 'legacy' },
    ];
    const visible = filterCommentsForClient(list);
    expect(visible.map((c) => c.id)).toEqual(['2', '4']);
  });
});
