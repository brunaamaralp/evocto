/**
 * 🧪 Teste para TestRunner Component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestRunner } from '@/components/qa/TestRunner';

// Mock do hook
const mockUseQATestRunner = {
  testResults: {},
  isRunning: false,
  currentTest: null,
  testProgress: { current: 0, total: 5 },
  error: null,
  runTest: jest.fn(),
  runAllTests: jest.fn(),
  cancelTest: jest.fn(),
  clearResults: jest.fn(),
  TEST_TYPES: {
    KANBAN_CLIENT: 'kanban_client',
    KANBAN_GLOBAL: 'kanban_global',
    PERFORMANCE: 'performance'
  },
  TEST_STEPS: {
    kanban_client: ['Carregar quadro do cliente', 'Testar rolagem horizontal'],
    kanban_global: ['Carregar quadro global', 'Testar filtros'],
    performance: ['Medir tempo de carregamento', 'Testar responsividade']
  }
};

jest.mock('@/hooks/useQATestRunner', () => ({
  useQATestRunner: () => mockUseQATestRunner
}));

describe('TestRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render test controls', () => {
    render(<TestRunner testContext={{}} />);
    
    expect(screen.getByText('Executor de Testes QA')).toBeInTheDocument();
    expect(screen.getByText('Executar Todos')).toBeInTheDocument();
    expect(screen.getByText('Limpar')).toBeInTheDocument();
  });

  it('should display test types', () => {
    render(<TestRunner testContext={{}} />);
    
    expect(screen.getByText('kanban client')).toBeInTheDocument();
    expect(screen.getByText('kanban global')).toBeInTheDocument();
    expect(screen.getByText('performance')).toBeInTheDocument();
  });

  it('should show execute buttons for each test', () => {
    render(<TestRunner testContext={{}} />);
    
    const executeButtons = screen.getAllByText('Executar');
    expect(executeButtons).toHaveLength(3); // One for each test type
  });

  it('should call runAllTests when clicking execute all button', () => {
    render(<TestRunner testContext={{}} />);
    
    const executeAllButton = screen.getByText('Executar Todos');
    fireEvent.click(executeAllButton);
    
    expect(mockUseQATestRunner.runAllTests).toHaveBeenCalledWith({});
  });

  it('should call runTest when clicking individual test button', () => {
    render(<TestRunner testContext={{}} />);
    
    const executeButtons = screen.getAllByText('Executar');
    fireEvent.click(executeButtons[0]);
    
    expect(mockUseQATestRunner.runTest).toHaveBeenCalledWith('kanban_client', {});
  });

  it('should show cancel button when running', () => {
    mockUseQATestRunner.isRunning = true;
    mockUseQATestRunner.currentTest = 'kanban_client';
    
    render(<TestRunner testContext={{}} />);
    
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Executando: kanban_client')).toBeInTheDocument();
  });

  it('should show progress when running', () => {
    mockUseQATestRunner.isRunning = true;
    mockUseQATestRunner.currentTest = 'kanban_client';
    mockUseQATestRunner.testProgress = { current: 2, total: 5 };
    
    render(<TestRunner testContext={{}} />);
    
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('should show error when present', () => {
    mockUseQATestRunner.error = 'Test error message';
    
    render(<TestRunner testContext={{}} />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should call clearResults when clicking clear button', () => {
    render(<TestRunner testContext={{}} />);
    
    const clearButton = screen.getByText('Limpar');
    fireEvent.click(clearButton);
    
    expect(mockUseQATestRunner.clearResults).toHaveBeenCalled();
  });

  it('should call cancelTest when clicking cancel button', () => {
    mockUseQATestRunner.isRunning = true;
    
    render(<TestRunner testContext={{}} />);
    
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    
    expect(mockUseQATestRunner.cancelTest).toHaveBeenCalled();
  });

  it('should disable buttons when running', () => {
    mockUseQATestRunner.isRunning = true;
    
    render(<TestRunner testContext={{}} />);
    
    const executeButtons = screen.getAllByText('Executar');
    executeButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should show test steps', () => {
    render(<TestRunner testContext={{}} />);
    
    expect(screen.getByText('Carregar quadro do cliente')).toBeInTheDocument();
    expect(screen.getByText('Testar rolagem horizontal')).toBeInTheDocument();
    expect(screen.getByText('Carregar quadro global')).toBeInTheDocument();
    expect(screen.getByText('Testar filtros')).toBeInTheDocument();
  });
});

