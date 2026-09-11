import { describe, it, expect } from 'vitest';
import { partitionLensServices } from '../partitionLensServices.js';

describe('partitionLensServices', () => {
  const services = [
    { id: '1', name: 'A' },
    { id: '2', name: 'B' },
    { id: '3', name: 'C' },
    { id: '4', name: 'D' },
    { id: '5', name: 'E' },
  ];

  it('mantém selecionado visível e joga o resto para overflow', () => {
    const { visible, overflow } = partitionLensServices(services, '4', 3);
    expect(visible.map((s) => s.id)).toEqual(['4', '1', '2']);
    expect(overflow.map((s) => s.id)).toEqual(['3', '5']);
  });

  it('sem overflow quando cabe no limite', () => {
    const { visible, overflow } = partitionLensServices(
      services.slice(0, 2),
      '1',
      3
    );
    expect(visible).toHaveLength(2);
    expect(overflow).toHaveLength(0);
  });
});
