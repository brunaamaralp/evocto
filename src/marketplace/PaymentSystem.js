import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de Pagamentos e Comissões
 * Implementa processamento de pagamentos e cálculo de comissões
 */
export class PaymentSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.payments = new Map();
    this.commissions = new Map();
    this.providers = new Map();
    this.payouts = new Map();
    this.refunds = new Map();
    this.webhooks = new Map();
    this.paymentMethods = new Map();
    this.fees = new Map();
    
    this.initializePaymentProviders();
    this.initializeCommissionRules();
    this.initializePaymentMethods();
  }

  /**
   * Inicializa provedores de pagamento
   */
  initializePaymentProviders() {
    this.providers.set('stripe', {
      id: 'stripe',
      name: 'Stripe',
      type: 'card',
      fees: {
        percentage: 2.9,
        fixed: 0.30,
        currency: 'USD'
      },
      supportedCurrencies: ['USD', 'EUR', 'BRL'],
      status: 'active'
    });

    this.providers.set('paypal', {
      id: 'paypal',
      name: 'PayPal',
      type: 'digital_wallet',
      fees: {
        percentage: 3.4,
        fixed: 0.35,
        currency: 'USD'
      },
      supportedCurrencies: ['USD', 'EUR', 'BRL'],
      status: 'active'
    });

    this.providers.set('pix', {
      id: 'pix',
      name: 'PIX',
      type: 'instant_transfer',
      fees: {
        percentage: 0,
        fixed: 0,
        currency: 'BRL'
      },
      supportedCurrencies: ['BRL'],
      status: 'active'
    });

    this.providers.set('boleto', {
      id: 'boleto',
      name: 'Boleto Bancário',
      type: 'bank_slip',
      fees: {
        percentage: 0,
        fixed: 2.50,
        currency: 'BRL'
      },
      supportedCurrencies: ['BRL'],
      status: 'active'
    });
  }

  /**
   * Inicializa regras de comissão
   */
  initializeCommissionRules() {
    this.commissions.set('standard', {
      id: 'standard',
      name: 'Comissão Padrão',
      type: 'percentage',
      rate: 15, // 15%
      minAmount: 0,
      maxAmount: null,
      applicableTo: ['all']
    });

    this.commissions.set('premium', {
      id: 'premium',
      name: 'Comissão Premium',
      type: 'percentage',
      rate: 20, // 20%
      minAmount: 10000,
      maxAmount: null,
      applicableTo: ['premium_services']
    });

    this.commissions.set('volume', {
      id: 'volume',
      name: 'Comissão por Volume',
      type: 'tiered',
      tiers: [
        { minAmount: 0, maxAmount: 5000, rate: 15 },
        { minAmount: 5001, maxAmount: 20000, rate: 18 },
        { minAmount: 20001, maxAmount: null, rate: 22 }
      ],
      applicableTo: ['all']
    });
  }

  /**
   * Inicializa métodos de pagamento
   */
  initializePaymentMethods() {
    this.paymentMethods.set('credit_card', {
      id: 'credit_card',
      name: 'Cartão de Crédito',
      provider: 'stripe',
      processingTime: 'instant',
      fees: {
        percentage: 2.9,
        fixed: 0.30
      }
    });

    this.paymentMethods.set('debit_card', {
      id: 'debit_card',
      name: 'Cartão de Débito',
      provider: 'stripe',
      processingTime: 'instant',
      fees: {
        percentage: 2.9,
        fixed: 0.30
      }
    });

    this.paymentMethods.set('pix', {
      id: 'pix',
      name: 'PIX',
      provider: 'pix',
      processingTime: 'instant',
      fees: {
        percentage: 0,
        fixed: 0
      }
    });

    this.paymentMethods.set('boleto', {
      id: 'boleto',
      name: 'Boleto Bancário',
      provider: 'boleto',
      processingTime: '3-5 days',
      fees: {
        percentage: 0,
        fixed: 2.50
      }
    });
  }

  /**
   * Processa pagamento
   */
  async processPayment(paymentData) {
    const payment = {
      id: uuidv4(),
      orderId: paymentData.orderId,
      clientId: paymentData.clientId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'BRL',
      method: paymentData.method,
      provider: this.getProviderForMethod(paymentData.method),
      status: 'pending',
      fees: this.calculateFees(paymentData.amount, paymentData.method),
      netAmount: paymentData.amount - this.calculateFees(paymentData.amount, paymentData.method),
      metadata: paymentData.metadata || {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.payments.set(payment.id, payment);
    
    try {
      // Simular processamento de pagamento
      const result = await this.simulatePaymentProcessing(payment);
      
      payment.status = result.success ? 'completed' : 'failed';
      payment.processingResult = result;
      payment.updatedAt = Date.now();

      if (result.success) {
        // Calcular comissões
        const commission = this.calculateCommission(payment);
        this.commissions.set(payment.id, commission);
        
        this.emit('payment_completed', { payment, commission });
      } else {
        this.emit('payment_failed', { payment, error: result.error });
      }

      return payment;
    } catch (error) {
      payment.status = 'failed';
      payment.error = error.message;
      payment.updatedAt = Date.now();
      
      this.emit('payment_failed', { payment, error: error.message });
      throw error;
    }
  }

  /**
   * Simula processamento de pagamento
   */
  async simulatePaymentProcessing(payment) {
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simular taxa de sucesso de 95%
    const success = Math.random() > 0.05;
    
    if (success) {
      return {
        success: true,
        transactionId: `txn_${uuidv4().substring(0, 8)}`,
        processedAt: Date.now(),
        providerResponse: {
          status: 'succeeded',
          amount: payment.amount,
          currency: payment.currency
        }
      };
    } else {
      return {
        success: false,
        error: 'Payment processing failed',
        errorCode: 'PROCESSING_ERROR',
        providerResponse: {
          status: 'failed',
          error: 'Insufficient funds'
        }
      };
    }
  }

  /**
   * Calcula taxas de pagamento
   */
  calculateFees(amount, method) {
    const methodInfo = this.paymentMethods.get(method);
    if (!methodInfo) return 0;

    const fees = methodInfo.fees;
    return (amount * fees.percentage / 100) + fees.fixed;
  }

  /**
   * Calcula comissão
   */
  calculateCommission(payment) {
    const applicableRules = this.getApplicableCommissionRules(payment);
    
    let totalCommission = 0;
    const appliedRules = [];

    for (const rule of applicableRules) {
      let commission = 0;
      
      if (rule.type === 'percentage') {
        commission = payment.netAmount * rule.rate / 100;
      } else if (rule.type === 'tiered') {
        commission = this.calculateTieredCommission(payment.netAmount, rule.tiers);
      }

      if (commission > 0) {
        totalCommission += commission;
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          rate: rule.rate,
          amount: commission
        });
      }
    }

    const commission = {
      id: uuidv4(),
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: totalCommission,
      currency: payment.currency,
      appliedRules,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return commission;
  }

  /**
   * Obtém regras de comissão aplicáveis
   */
  getApplicableCommissionRules(payment) {
    const applicableRules = [];
    
    for (const [ruleId, rule] of this.commissions) {
      // Verificar se a regra se aplica ao valor
      if (rule.minAmount && payment.netAmount < rule.minAmount) continue;
      if (rule.maxAmount && payment.netAmount > rule.maxAmount) continue;
      
      // Verificar se a regra se aplica ao tipo de serviço
      if (rule.applicableTo.includes('all') || 
          rule.applicableTo.some(type => payment.metadata.serviceType === type)) {
        applicableRules.push(rule);
      }
    }

    return applicableRules;
  }

  /**
   * Calcula comissão por faixas
   */
  calculateTieredCommission(amount, tiers) {
    let totalCommission = 0;
    let remainingAmount = amount;

    for (const tier of tiers) {
      if (remainingAmount <= 0) break;
      
      const tierAmount = Math.min(
        remainingAmount,
        tier.maxAmount ? tier.maxAmount - tier.minAmount : remainingAmount
      );
      
      if (tierAmount > 0) {
        totalCommission += tierAmount * tier.rate / 100;
        remainingAmount -= tierAmount;
      }
    }

    return totalCommission;
  }

  /**
   * Obtém provedor para método de pagamento
   */
  getProviderForMethod(method) {
    const methodInfo = this.paymentMethods.get(method);
    return methodInfo ? methodInfo.provider : null;
  }

  /**
   * Processa reembolso
   */
  async processRefund(paymentId, refundData) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Pagamento não encontrado: ${paymentId}`);
    }

    if (payment.status !== 'completed') {
      throw new Error('Apenas pagamentos completados podem ser reembolsados');
    }

    const refund = {
      id: uuidv4(),
      paymentId,
      orderId: payment.orderId,
      amount: refundData.amount || payment.amount,
      currency: payment.currency,
      reason: refundData.reason,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.refunds.set(refund.id, refund);

    try {
      // Simular processamento de reembolso
      const result = await this.simulateRefundProcessing(refund);
      
      refund.status = result.success ? 'completed' : 'failed';
      refund.processingResult = result;
      refund.updatedAt = Date.now();

      if (result.success) {
        // Reverter comissão
        const commission = this.commissions.get(paymentId);
        if (commission) {
          commission.status = 'reversed';
          commission.updatedAt = Date.now();
        }
        
        this.emit('refund_completed', { refund });
      } else {
        this.emit('refund_failed', { refund, error: result.error });
      }

      return refund;
    } catch (error) {
      refund.status = 'failed';
      refund.error = error.message;
      refund.updatedAt = Date.now();
      
      this.emit('refund_failed', { refund, error: error.message });
      throw error;
    }
  }

  /**
   * Simula processamento de reembolso
   */
  async simulateRefundProcessing(refund) {
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simular taxa de sucesso de 98%
    const success = Math.random() > 0.02;
    
    if (success) {
      return {
        success: true,
        refundId: `ref_${uuidv4().substring(0, 8)}`,
        processedAt: Date.now(),
        providerResponse: {
          status: 'succeeded',
          amount: refund.amount,
          currency: refund.currency
        }
      };
    } else {
      return {
        success: false,
        error: 'Refund processing failed',
        errorCode: 'REFUND_ERROR',
        providerResponse: {
          status: 'failed',
          error: 'Refund not allowed'
        }
      };
    }
  }

  /**
   * Processa pagamento de comissão
   */
  async processCommissionPayout(commissionId, payoutData) {
    const commission = this.commissions.get(commissionId);
    if (!commission) {
      throw new Error(`Comissão não encontrada: ${commissionId}`);
    }

    if (commission.status !== 'pending') {
      throw new Error('Apenas comissões pendentes podem ser pagas');
    }

    const payout = {
      id: uuidv4(),
      commissionId,
      amount: commission.amount,
      currency: commission.currency,
      method: payoutData.method,
      provider: payoutData.provider,
      status: 'pending',
      fees: this.calculatePayoutFees(commission.amount, payoutData.method),
      netAmount: commission.amount - this.calculatePayoutFees(commission.amount, payoutData.method),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.payouts.set(payout.id, payout);

    try {
      // Simular processamento de pagamento
      const result = await this.simulatePayoutProcessing(payout);
      
      payout.status = result.success ? 'completed' : 'failed';
      payout.processingResult = result;
      payout.updatedAt = Date.now();

      if (result.success) {
        commission.status = 'paid';
        commission.updatedAt = Date.now();
        
        this.emit('payout_completed', { payout, commission });
      } else {
        this.emit('payout_failed', { payout, error: result.error });
      }

      return payout;
    } catch (error) {
      payout.status = 'failed';
      payout.error = error.message;
      payout.updatedAt = Date.now();
      
      this.emit('payout_failed', { payout, error: error.message });
      throw error;
    }
  }

  /**
   * Simula processamento de pagamento
   */
  async simulatePayoutProcessing(payout) {
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simular taxa de sucesso de 97%
    const success = Math.random() > 0.03;
    
    if (success) {
      return {
        success: true,
        payoutId: `payout_${uuidv4().substring(0, 8)}`,
        processedAt: Date.now(),
        providerResponse: {
          status: 'succeeded',
          amount: payout.netAmount,
          currency: payout.currency
        }
      };
    } else {
      return {
        success: false,
        error: 'Payout processing failed',
        errorCode: 'PAYOUT_ERROR',
        providerResponse: {
          status: 'failed',
          error: 'Invalid account'
        }
      };
    }
  }

  /**
   * Calcula taxas de pagamento
   */
  calculatePayoutFees(amount, method) {
    // Taxas de pagamento são geralmente menores que taxas de recebimento
    const fees = {
      'bank_transfer': { percentage: 0.5, fixed: 1.00 },
      'pix': { percentage: 0, fixed: 0 },
      'paypal': { percentage: 2.0, fixed: 0.30 }
    };

    const methodFees = fees[method] || { percentage: 1.0, fixed: 0.50 };
    return (amount * methodFees.percentage / 100) + methodFees.fixed;
  }

  /**
   * Obtém pagamento
   */
  getPayment(paymentId) {
    return this.payments.get(paymentId);
  }

  /**
   * Obtém todos os pagamentos
   */
  getAllPayments() {
    return Array.from(this.payments.values());
  }

  /**
   * Obtém comissões
   */
  getCommissions(status = null) {
    const commissions = Array.from(this.commissions.values());
    if (status) {
      return commissions.filter(commission => commission.status === status);
    }
    return commissions;
  }

  /**
   * Obtém pagamentos
   */
  getPayouts(status = null) {
    const payouts = Array.from(this.payouts.values());
    if (status) {
      return payouts.filter(payout => payout.status === status);
    }
    return payouts;
  }

  /**
   * Obtém reembolsos
   */
  getRefunds(status = null) {
    const refunds = Array.from(this.refunds.values());
    if (status) {
      return refunds.filter(refund => refund.status === status);
    }
    return refunds;
  }

  /**
   * Obtém estatísticas de pagamento
   */
  getPaymentStats() {
    const payments = Array.from(this.payments.values());
    const commissions = Array.from(this.commissions.values());
    const payouts = Array.from(this.payouts.values());
    const refunds = Array.from(this.refunds.values());

    const totalPayments = payments.length;
    const successfulPayments = payments.filter(p => p.status === 'completed').length;
    const totalAmount = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    const totalFees = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.fees, 0);
    const totalCommissions = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
    const totalRefunds = refunds.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount, 0);

    return {
      totalPayments,
      successfulPayments,
      successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
      totalAmount,
      totalFees,
      totalCommissions,
      totalRefunds,
      netRevenue: totalAmount - totalFees - totalRefunds
    };
  }
}

// Instância singleton
export const paymentSystem = new PaymentSystem();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.paymentSystem = paymentSystem;
}

