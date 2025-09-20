/**
 * 🧪 Teste para useQATestRunner Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useQATestRunner } from '@/hooks/useQATestRunner';

// Mock das entidades da API
jest.mock('@/api/entities', () => ({
  Task: {
    filter: jest.fn()
  },
  Client: {
    filter: jest.fn()
  },
  User: {
    me: jest.fn()
  }
}));

describe('useQATestRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useQATestRunner());
    
    expect(result.current.testResults).toEqual({});
    expect(result.current.isRunning).toBe(false);
    expect(result.current.currentTest).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should have correct test types', () => {
    const { result } = renderHook(() => useQATestRunner());
    
    expect(result.current.TEST_TYPES).toEqual({
      KANBAN_CLIENT: 'kanban_client',
      KANBAN_GLOBAL: 'kanban_global',
      PERFORMANCE: 'performance',
      STRESS: 'stress',
      CONSISTENCY: 'consistency'
    });
  });

  it('should clear results', () => {
    const { result } = renderHook(() => useQATestRunner());
    
    act(() => {
      result.current.clearResults();
    });
    
    expect(result.current.testResults).toEqual({});
    expect(result.current.error).toBe(null);
  });

  it('should prevent running multiple tests simultaneously', async () => {
    const { result } = renderHook(() => useQATestRunner());
    
    // Mock para simular teste em execução
    act(() => {
      result.current.runTest('kanban_client', {});
    });
    
    expect(result.current.isRunning).toBe(true);
    
    // Tentar executar outro teste deve falhar
    await expect(
      act(async () => {
        await result.current.runTest('kanban_global', {});
      })
    ).rejects.toThrow('Teste já está em execução');
  });
});

