// Click-Guard: Detecta CTAs mortos e links inválidos (DEV only)
export class ClickGuard {
  static isEnabled = true; // Always enabled in this environment
  static findings = [];

  static init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.audit());
    } else {
      this.audit();
    }

    // Re-audit when components re-render
    const observer = new MutationObserver(() => {
      clearTimeout(this.auditTimeout);
      this.auditTimeout = setTimeout(() => this.audit(), 500);
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  static audit() {
    this.findings = [];
    const elements = document.querySelectorAll([
      '[data-cta]',
      'a[role="button"]', 
      'button',
      'a[href]'
    ].join(','));

    elements.forEach(el => this.checkElement(el));
    this.report();
  }

  static checkElement(el) {
    const screen = this.getScreenName();
    const cta = el.getAttribute('data-cta') || this.inferCTAName(el);
    const tagName = el.tagName.toLowerCase();

    // Check buttons and button-role elements
    if (tagName === 'button' || el.getAttribute('role') === 'button') {
      if (!el.onclick && !el.getAttribute('onclick') && !this.hasReactHandler(el)) {
        this.addFinding({
          type: 'CTA_MISSING_HANDLER',
          screen,
          cta,
          element: el,
          message: `Button without onClick handler`
        });
      }
      return;
    }

    // Check links
    if (tagName === 'a') {
      const href = el.getAttribute('href');
      
      if (!href || href === '#' || href === '') {
        this.addFinding({
          type: 'LINK_MISSING_HREF',
          screen,
          cta,
          element: el,
          href,
          message: `Link without valid href`
        });
        return;
      }

      // Check if internal route exists
      if (href.startsWith('/') && !href.startsWith('//')) {
        this.checkInternalRoute(href, screen, cta, el);
      }
    }
  }

  static hasReactHandler(el) {
    // Check if element has React event listeners
    const reactProps = Object.keys(el).find(key => key.startsWith('__react'));
    if (!reactProps) return false;
    
    const props = el[reactProps]?.pendingProps || el[reactProps]?.memoizedProps;
    return props && (props.onClick || props.onMouseDown);
  }

  static checkInternalRoute(href, screen, cta, el) {
    // Simple route validation - could be enhanced with actual route matching
    const problematicPatterns = [
      /\/undefined/,
      /\/null/,
      /\/\[object/,
      /\/clients\/$/,
      /\/services\/$/
    ];

    if (problematicPatterns.some(pattern => pattern.test(href))) {
      this.addFinding({
        type: 'ROUTE_INVALID_PARAMS',
        screen,
        cta,
        element: el,
        href,
        message: `Route with invalid parameters: ${href}`
      });
    }
  }

  static getScreenName() {
    // Try to determine current screen/page
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length === 0) return 'home';
    if (segments[0] === 'clients' && segments[1]) return `client-${segments[2] || 'overview'}`;
    if (segments[0] === 'rc') return 'rc-public';
    if (segments[0] === 'c') return 'client-portal';
    
    return segments.join('-') || 'unknown';
  }

  static inferCTAName(el) {
    // Try to infer CTA name from element
    const text = el.textContent?.trim().toLowerCase();
    const ariaLabel = el.getAttribute('aria-label');
    const title = el.getAttribute('title');
    
    return ariaLabel || title || text?.slice(0, 20) || 'unnamed-cta';
  }

  static addFinding(finding) {
    this.findings.push({
      ...finding,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });

    // Log to console for immediate feedback
    console.warn(`🔍 ClickGuard: ${finding.type} - ${finding.message}`, finding);
  }

  static report() {
    if (this.findings.length === 0) {
      console.log('✅ ClickGuard: No CTA issues found');
      return;
    }

    console.group('🔍 ClickGuard Report');
    console.table(this.findings.map(f => ({
      Screen: f.screen,
      CTA: f.cta,
      Type: f.type,
      Href: f.href || 'N/A',
      Message: f.message
    })));
    console.groupEnd();

    // Export for external tools
    window.clickGuardFindings = this.findings;
  }

  static getCriticalCTAs() {
    return [
      // Today Context
      { screen: 'today', cta: 'open-cycle' },
      { screen: 'today', cta: 'open-plan' },
      { screen: 'today', cta: 'open-briefing' },
      { screen: 'today', cta: 'open-library' },

      // Client Overview
      { screen: 'client-overview', cta: 'ver-plano-ciclo' },
      { screen: 'client-overview', cta: 'briefing' },
      { screen: 'client-overview', cta: 'evolution' },

      // Briefing
      { screen: 'briefing', cta: 'gerar-rc' },
      { screen: 'briefing', cta: 'abrir-rc' },

      // Service
      { screen: 'service', cta: 'definir-ciclo' },
      { screen: 'service', cta: 'iniciar-ciclo' },

      // Cycle Plan
      { screen: 'cycle-plan', cta: 'gerar-plano-ia' },
      { screen: 'cycle-plan', cta: 'ver-plano-completo' },

      // Cycle Closing
      { screen: 'cycle-closing', cta: 'processar-ia' },
      { screen: 'cycle-closing', cta: 'fechar-ciclo' },

      // Library
      { screen: 'library', cta: 'upload' },
      { screen: 'library', cta: 'abrir-aprendizado' },

      // Playbooks
      { screen: 'playbooks', cta: 'publicar' },
      { screen: 'playbooks', cta: 'arquivar' },
      { screen: 'playbooks', cta: 'editar' },

      // Services & Templates
      { screen: 'services', cta: 'criar-servico' },
      { screen: 'service-template', cta: 'salvar-template' },
      { screen: 'service-template', cta: 'propagar-mudancas' },

      // Client Portal
      { screen: 'client-portal', cta: 'abrir-aprovar' },
      { screen: 'client-portal', cta: 'baixar-pdf' },

      // RC Public
      { screen: 'rc-public', cta: 'aprovar-briefing' },
      { screen: 'rc-public', cta: 'aprovar-plano' },
      { screen: 'rc-public', cta: 'pedir-ajustes' }
    ];
  }
}

// Auto-init in development
if (ClickGuard.isEnabled) {
  ClickGuard.init();
}