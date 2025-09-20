// CTA Auditor: Automated testing of critical CTAs
import { ClickGuard } from './click-guard';
import { RouteRegistry } from './route-registry';

export class CTAAuditor {
  static async runSmokeTest() {
    const results = {
      clickGuard: [],
      routes: [],
      criticalCTAs: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };

    console.log('🔍 Starting CTA Smoke Test...');

    // 1. Run Click-Guard audit
    if (ClickGuard.isEnabled) {
      ClickGuard.audit();
      results.clickGuard = ClickGuard.findings;
    }

    // 2. Test route registry
    const routeTests = await RouteRegistry.smokeTest();
    results.routes = routeTests;

    // 3. Test critical CTAs
    const criticalCTAs = await this.testCriticalCTAs();
    results.criticalCTAs = criticalCTAs;

    // 4. Compile summary
    results.summary.total = results.clickGuard.length + results.routes.length + results.criticalCTAs.length;
    results.summary.failed = results.clickGuard.length + 
      results.routes.filter(r => r.status !== 'ROUTE_OK').length +
      results.criticalCTAs.filter(c => c.status !== 'CTA_OK').length;
    results.summary.passed = results.summary.total - results.summary.failed;

    this.reportResults(results);
    return results;
  }

  static async testCriticalCTAs() {
    const criticalCTAs = [
      // Today Context
      { screen: 'today', selector: '[data-cta*="open-cycle"]', expectedHref: /\/clients\/.*\/services\/.*\/cycles/ },
      { screen: 'today', selector: '[data-cta*="open-plan"]', expectedHref: /\/clients\/.*\/services\/.*\/cycles\/.*\/plan/ },

      // Client Overview  
      { screen: 'client', selector: '[data-cta*="ver-plano"]', expectedHref: /\/clients\/.*\/services\/.*\/cycles\/.*\/plan/ },
      { screen: 'client', selector: '[data-cta*="briefing"]', expectedHref: /\/briefing-editor/ },

      // Briefing
      { screen: 'briefing', selector: '[data-cta*="gerar-rc"]', action: 'click' },
      { screen: 'briefing', selector: '[data-cta*="abrir-rc"]', expectedHref: /\/rc\// },

      // Services
      { screen: 'services', selector: '[data-cta*="criar-servico"]', action: 'modal' },

      // Library
      { screen: 'library', selector: '[data-cta*="upload"]', action: 'modal' },

      // Client Portal
      { screen: 'client-portal', selector: '[data-cta*="abrir-aprovar"]', expectedHref: /\/rc\// },
      { screen: 'client-portal', selector: '[data-cta*="baixar-pdf"]', expectedHref: /\.(pdf|PDF)$/ },

      // RC Public
      { screen: 'rc-public', selector: '[data-cta*="aprovar"]', action: 'submit' }
    ];

    const results = [];

    for (const cta of criticalCTAs) {
      try {
        const element = document.querySelector(cta.selector);
        
        if (!element) {
          results.push({
            ...cta,
            status: 'CTA_NOT_FOUND',
            message: `CTA element not found: ${cta.selector}`
          });
          continue;
        }

        if (cta.expectedHref) {
          const href = element.href || element.getAttribute('href');
          
          if (!href) {
            results.push({
              ...cta,
              status: 'CTA_MISSING_HREF',
              message: `CTA missing href`
            });
            continue;
          }

          if (!cta.expectedHref.test(href)) {
            results.push({
              ...cta,
              status: 'CTA_INVALID_HREF',
              href,
              message: `CTA href doesn't match pattern`
            });
            continue;
          }
        }

        if (cta.action) {
          const hasHandler = element.onclick || 
            element.getAttribute('onclick') || 
            ClickGuard.hasReactHandler(element);

          if (!hasHandler) {
            results.push({
              ...cta,
              status: 'CTA_MISSING_HANDLER',
              message: `CTA missing ${cta.action} handler`
            });
            continue;
          }
        }

        results.push({
          ...cta,
          status: 'CTA_OK',
          message: 'CTA validation passed'
        });

      } catch (error) {
        results.push({
          ...cta,
          status: 'CTA_ERROR',
          message: error.message
        });
      }
    }

    return results;
  }

  static reportResults(results) {
    console.group('🔍 CTA Smoke Test Results');
    
    console.log(`Summary: ${results.summary.passed}/${results.summary.total} passed`);
    
    if (results.summary.failed > 0) {
      console.warn(`❌ ${results.summary.failed} issues found`);
      
      if (results.clickGuard.length > 0) {
        console.group('Click-Guard Issues');
        console.table(results.clickGuard);
        console.groupEnd();
      }

      if (results.routes.some(r => r.status !== 'ROUTE_OK')) {
        console.group('Route Issues');
        console.table(results.routes.filter(r => r.status !== 'ROUTE_OK'));
        console.groupEnd();
      }

      if (results.criticalCTAs.some(c => c.status !== 'CTA_OK')) {
        console.group('Critical CTA Issues');
        console.table(results.criticalCTAs.filter(c => c.status !== 'CTA_OK'));
        console.groupEnd();
      }
    } else {
      console.log('✅ All tests passed!');
    }
    
    console.groupEnd();

    // Make results available globally for debugging
    window.ctaSmokeTestResults = results;
  }
}

// Auto-run smoke test in development
// Wait for app to load, then run smoke test
setTimeout(() => {
  if (document.readyState === 'complete') {
    CTAAuditor.runSmokeTest();
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => CTAAuditor.runSmokeTest(), 1000);
    });
  }
}, 2000);