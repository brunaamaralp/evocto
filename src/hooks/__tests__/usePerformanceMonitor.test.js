/**
 * 🧪 Teste para usePerformanceMonitor Hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    // Mock performance.now
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with empty metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    expect(result.current.metrics).toEqual({});
    expect(result.current.history).toEqual([]);
    expect(result.current.isMonitoring).toBe(false);
  });

  it('should record metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    act(() => {
      result.current.recordMetric('test-metric', 100, 200);
    });
    
    expect(result.current.metrics['test-metric']).toBeDefined();
    expect(result.current.metrics['test-metric'].value).toBe(100);
    expect(result.current.metrics['test-metric'].status).toBe('good');
  });

  it('should calculate stats correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    act(() => {
      result.current.recordMetric('metric1', 100);
      result.current.recordMetric('metric2', 200);
    });
    
    const stats = result.current.getStats();
    expect(stats.total).toBe(2);
    expect(stats.average).toBe(150);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(200);
  });

  it('should check thresholds correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    const goodResult = result.current.checkThreshold('clientKanbanLoadTime', 2000);
    expect(goodResult.status).toBe('good');
    
    const warningResult = result.current.checkThreshold('clientKanbanLoadTime', 4000);
    expect(warningResult.status).toBe('warning');
  });

  it('should measure execution time', async () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    const mockFn = jest.fn().mockResolvedValue('test result');
    
    const measurement = await act(async () => {
      return await result.current.measureExecution('test-execution', mockFn, 1000);
    });
    
    expect(measurement.result).toBe('test result');
    expect(measurement.duration).toBeDefined();
    expect(measurement.status).toBe('info');
  });
});

