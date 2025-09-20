import { Notification, NotificationPreference, User } from '@/api/entities';
import { SendEmail } from '@/api/integrations';

export class NotificationService {
  static async createNotification({
    userId,
    agencyId,
    type,
    subject,
    title,
    context = '',
    href,
    severity = 'info',
    metadata = {},
    dedupKey = null
  }) {
    try {
      // Check for existing notification with same dedupKey
      if (dedupKey) {
        const existing = await Notification.filter({ 
          userId, 
          dedupKey,
          readAt: null 
        });
        
        if (existing.length > 0) {
          // Update existing instead of creating duplicate
          return await Notification.update(existing[0].id, {
            title,
            context,
            href,
            metadata,
            created_date: new Date().toISOString()
          });
        }
      }

      // Create new notification
      const notification = await Notification.create({
        userId,
        agencyId,
        type,
        subject,
        title,
        context,
        href,
        severity,
        metadata,
        dedupKey
      });

      // Check if should send email
      await this.maybeSendEmail(notification);

      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  static async maybeSendEmail(notification) {
    try {
      // Get user preferences
      const preferences = await NotificationPreference.filter({ 
        userId: notification.userId 
      });
      
      const userPrefs = preferences[0] || this.getDefaultPreferences();
      
      // Check if user wants email for this type
      if (userPrefs.email === 'off') return;
      
      if (userPrefs.email === 'digest_only' && notification.severity !== 'critical') {
        // Will be sent in digest
        return;
      }
      
      if (userPrefs.email === 'important' && notification.severity === 'info') {
        // Skip non-important
        return;
      }

      // Check type preferences
      if (!userPrefs.typePreferences[notification.type]) return;

      // Check quiet hours
      if (userPrefs.quietHours.enabled && notification.severity !== 'critical') {
        if (this.isInQuietHours(userPrefs.quietHours)) {
          // Queue for digest
          return;
        }
      }

      // Get user email
      const user = await User.get(notification.userId);
      if (!user.email) return;

      // Send immediate email
      await SendEmail({
        to: user.email,
        subject: `EvolvIA: ${notification.title}`,
        body: this.buildEmailBody(notification, user)
      });

      // Mark as sent
      await Notification.update(notification.id, {
        emailSentAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  static getDefaultPreferences() {
    return {
      email: 'important',
      quietHours: { enabled: true, startTime: '20:00', endTime: '08:00' },
      typePreferences: {
        rc_created: true,
        rc_expiring: true,
        plan_pending: true,
        plan_approved: true,
        cycle_due: true,
        workorder_due: true,
        briefing_review: false,
        learning_triage: false,
        health_alert: true
      }
    };
  }

  static isInQuietHours(quietHours) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime < endTime) {
      // Same day range
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  static buildEmailBody(notification, user) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notification.title}</h2>
        <p>${notification.context}</p>
        <p>
          <a href="${baseUrl}${notification.href}" 
             style="background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Abrir no EvolvIA
          </a>
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 14px;">
          Para alterar suas preferências de notificação, 
          <a href="${baseUrl}/notification-preferences">clique aqui</a>.
        </p>
      </div>
    `;
  }
}

// Helper functions for specific notification types
export const createRCExpiringNotification = async (briefingVersion, user) => {
  const hoursLeft = Math.round((new Date(briefingVersion.token_expires_at) - new Date()) / (1000 * 60 * 60));
  
  return await NotificationService.createNotification({
    userId: user.id,
    agencyId: briefingVersion.agencyId,
    type: 'rc_expiring',
    subject: { type: 'rc', id: briefingVersion.id },
    title: `RC expira em ${hoursLeft}h`,
    context: `Versão ${briefingVersion.version_name} aguardando aprovação`,
    href: `/public-approval?token=${briefingVersion.public_share_token}`,
    severity: hoursLeft <= 12 ? 'critical' : 'warn',
    dedupKey: `rc:${briefingVersion.id}:expiring:T-${hoursLeft}h`
  });
};

export const createPlanPendingNotification = async (cycle, user) => {
  return await NotificationService.createNotification({
    userId: user.id,
    agencyId: cycle.agencyId,
    type: 'plan_pending',
    subject: { type: 'cycle', id: cycle.id },
    title: `Plano ${cycle.cyclePeriod} aguardando aprovação`,
    context: `Serviço precisa de aprovação para iniciar execução`,
    href: `/cycles/${cycle.id}/approval`,
    severity: 'warn'
  });
};