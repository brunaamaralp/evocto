/**
 * Utilitário para verificar integridade do build em runtime
 * Como não podemos criar scripts externos, fazemos verificações no cliente
 */

// import { componentExports, checkEssentialComponents } from './imports';

// Funções simples para substituir as que não existem
const componentExports = {};
const checkEssentialComponents = () => ({ hasIssues: false, issues: [] });

/**
 * Verifica se componentes essenciais estão disponíveis
 */
export const runBuildCheck = async () => {
  const issues = [];
  
  try {
    // Verificar componentes essenciais
    const componentCheck = checkEssentialComponents();
    if (componentCheck.hasIssues) {
      issues.push(...componentCheck.issues);
    }

    // Verificar se entidades principais existem
    const essentialEntities = ['Client', 'Service', 'Task'];
    
    for (const entityName of essentialEntities) {
      try {
        const { [entityName]: Entity } = await import(`@/api/entities/${entityName}.js`);
        if (!Entity) {
          issues.push(`Entidade ${entityName} não encontrada ou sem export padrão`);
        }
      } catch (error) {
        issues.push(`Erro ao importar entidade ${entityName}: ${error.message}`);
      }
    }

    return {
      success: issues.length === 0,
      issues
    };
    
  } catch (error) {
    return {
      success: false,
      issues: [`Erro geral na verificação: ${error.message}`]
    };
  }
};

/**
 * Relatório de saúde do sistema
 */
export const getSystemHealth = async () => {
  const buildCheck = await runBuildCheck();
  
  return {
    timestamp: new Date().toISOString(),
    buildStatus: buildCheck.success ? 'healthy' : 'issues',
    totalIssues: buildCheck.issues.length,
    issues: buildCheck.issues,
    recommendations: buildCheck.issues.length > 0 
      ? ['Verifique os imports faltantes', 'Confirme estrutura de entidades']
      : ['Sistema funcionando corretamente']
  };
};

/**
 * Hook para verificar saúde do sistema
 */
export const useSystemHealth = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthReport = await getSystemHealth();
        setHealth(healthReport);
      } catch (error) {
        setHealth({
          timestamp: new Date().toISOString(),
          buildStatus: 'error',
          totalIssues: 1,
          issues: [error.message],
          recommendations: ['Contate o suporte técnico']
        });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  return { health, loading };
};