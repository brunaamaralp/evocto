/**
 * 📧 Implementação de Email Local
 * 
 * Suporte para SendGrid, Nodemailer e email mock
 */

// Implementação SendGrid
class SendGridEmail {
  constructor(config) {
    this.config = config;
    this.sgMail = null;
    this.init();
  }

  async init() {
    try {
      const sgMail = (await import('@sendgrid/mail')).default;
      sgMail.setApiKey(this.config.apiKey);
      this.sgMail = sgMail;
      console.log('✅ SendGrid inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar SendGrid:', error);
      throw error;
    }
  }

  async sendEmail(to, subject, body, options = {}) {
    try {
      const msg = {
        to,
        from: options.from || this.config.from,
        subject,
        html: body,
        text: this.htmlToText(body),
        ...options
      };

      await this.sgMail.send(msg);
      console.log(`✅ Email enviado para ${to}: ${subject}`);
      return { success: true, messageId: `sg_${Date.now()}` };
    } catch (error) {
      console.error('❌ Erro ao enviar email SendGrid:', error);
      throw error;
    }
  }

  async sendTemplate(to, templateId, data, options = {}) {
    try {
      const msg = {
        to,
        from: options.from || this.config.from,
        templateId,
        dynamicTemplateData: data,
        ...options
      };

      await this.sgMail.send(msg);
      console.log(`✅ Template ${templateId} enviado para ${to}`);
      return { success: true, messageId: `sg_template_${Date.now()}` };
    } catch (error) {
      console.error('❌ Erro ao enviar template SendGrid:', error);
      throw error;
    }
  }

  htmlToText(html) {
    // Conversão simples de HTML para texto
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}

// Implementação Nodemailer
class NodemailerEmail {
  constructor(config) {
    this.config = config;
    this.transporter = null;
    this.init();
  }

  async init() {
    try {
      const nodemailer = (await import('nodemailer')).default;
      
      this.transporter = nodemailer.createTransporter({
        host: this.config.host || 'smtp.gmail.com',
        port: this.config.port || 587,
        secure: this.config.secure || false,
        auth: {
          user: this.config.user,
          pass: this.config.pass
        }
      });

      // Verificar conexão
      await this.transporter.verify();
      console.log('✅ Nodemailer inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar Nodemailer:', error);
      throw error;
    }
  }

  async sendEmail(to, subject, body, options = {}) {
    try {
      const mailOptions = {
        from: options.from || this.config.from,
        to,
        subject,
        html: body,
        text: this.htmlToText(body),
        ...options
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado para ${to}: ${subject}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar email Nodemailer:', error);
      throw error;
    }
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}

// Implementação Mock (para desenvolvimento)
class MockEmail {
  constructor() {
    this.sentEmails = [];
    this.templates = {
      'briefing-invite': {
        subject: 'Convite para Briefing - {{clientName}}',
        body: `
          <h2>Olá {{clientName}}!</h2>
          <p>Você foi convidado para participar do briefing do projeto {{projectName}}.</p>
          <p>Clique no link abaixo para acessar:</p>
          <a href="{{briefingUrl}}">Acessar Briefing</a>
        `
      },
      'task-notification': {
        subject: 'Nova Tarefa Atribuída - {{taskTitle}}',
        body: `
          <h2>Nova Tarefa</h2>
          <p>Uma nova tarefa foi atribuída a você:</p>
          <h3>{{taskTitle}}</h3>
          <p>{{taskDescription}}</p>
          <p>Prazo: {{dueDate}}</p>
        `
      },
      'service-completed': {
        subject: 'Serviço Concluído - {{serviceName}}',
        body: `
          <h2>Serviço Concluído</h2>
          <p>O serviço {{serviceName}} foi concluído com sucesso!</p>
          <p>Cliente: {{clientName}}</p>
          <p>Data de conclusão: {{completionDate}}</p>
        `
      }
    };
    console.log('✅ Email Mock inicializado');
  }

  async sendEmail(to, subject, body, options = {}) {
    // Simular delay de envio
    await new Promise(resolve => setTimeout(resolve, 500));

    const email = {
      id: `mock_${Date.now()}`,
      to,
      from: options.from || 'noreply@evocto.com',
      subject,
      body,
      sentAt: new Date().toISOString(),
      status: 'sent',
      ...options
    };

    this.sentEmails.push(email);
    console.log(`📧 [Mock] Email enviado para ${to}: ${subject}`);
    
    return { success: true, messageId: email.id };
  }

  async sendTemplate(to, templateId, data, options = {}) {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Template ${templateId} não encontrado`);
    }

    // Substituir variáveis no template
    let subject = template.subject;
    let body = template.body;

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    return this.sendEmail(to, subject, body, options);
  }

  // Métodos auxiliares para desenvolvimento
  getSentEmails() {
    return this.sentEmails;
  }

  getEmailsTo(email) {
    return this.sentEmails.filter(e => e.to === email);
  }

  clearSentEmails() {
    this.sentEmails = [];
  }

  getAvailableTemplates() {
    return Object.keys(this.templates);
  }
}

// Implementação SMTP direto
class SMTPEmail {
  constructor(config) {
    this.config = config;
    this.transporter = null;
    this.init();
  }

  async init() {
    try {
      const nodemailer = (await import('nodemailer')).default;
      
      this.transporter = nodemailer.createTransporter({
        host: this.config.host,
        port: this.config.port || 587,
        secure: this.config.secure || false,
        auth: this.config.auth ? {
          user: this.config.auth.user,
          pass: this.config.auth.pass
        } : undefined,
        tls: this.config.tls || {}
      });

      await this.transporter.verify();
      console.log('✅ SMTP inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar SMTP:', error);
      throw error;
    }
  }

  async sendEmail(to, subject, body, options = {}) {
    try {
      const mailOptions = {
        from: options.from || this.config.from,
        to,
        subject,
        html: body,
        text: this.htmlToText(body),
        ...options
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email SMTP enviado para ${to}: ${subject}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar email SMTP:', error);
      throw error;
    }
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}

export { SendGridEmail, NodemailerEmail, MockEmail, SMTPEmail };

