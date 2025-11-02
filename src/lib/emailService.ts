// Email Notification Service using Resend
// Sends admin alerts for suspicious gaming activity

interface SuspiciousActivityEmail {
  userId: string;
  userEmail?: string;
  sessionId: string;
  gameType: string;
  suspicionScore: number;
  suspicionReasons: string[];
  clientScore: number;
  serverScore: number;
  status: 'accepted' | 'rejected';
  timestamp: string;
}

export class EmailService {
  private static readonly API_KEY = process.env.RESEND_API_KEY;
  private static readonly ADMIN_EMAIL = 'ryanfermoselle@outlook.com';
  private static readonly FROM_EMAIL = 'onboarding@resend.dev'; // Resend test domain
  
  /**
   * Send admin notification for suspicious activity
   */
  static async sendSuspiciousActivityAlert(data: SuspiciousActivityEmail): Promise<boolean> {
    if (!this.API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not set - email notification skipped');
      return false;
    }
    
    try {
      const subject = data.status === 'rejected'
        ? `🚨 HIGH RISK: Bot Activity Blocked (Score: ${data.suspicionScore})`
        : `⚠️ WARNING: Suspicious Activity Detected (Score: ${data.suspicionScore})`;
      
      const html = this.generateEmailHTML(data);
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.FROM_EMAIL,
          to: this.ADMIN_EMAIL,
          subject,
          html
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Email send failed:', error);
        return false;
      }
      
      console.log('✅ Admin notification email sent successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }
  
  /**
   * Generate HTML email template
   */
  private static generateEmailHTML(data: SuspiciousActivityEmail): string {
    const statusColor = data.status === 'rejected' ? '#ef4444' : '#f59e0b';
    const statusText = data.status === 'rejected' ? 'REJECTED' : 'ACCEPTED (FLAGGED)';
    const statusIcon = data.status === 'rejected' ? '🚫' : '⚠️';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suspicious Activity Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                ${statusIcon} Anti-Cheat Alert
              </h1>
              <p style="margin: 10px 0 0 0; color: #e5e7eb; font-size: 14px;">
                Suspicious gaming activity detected
              </p>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td style="padding: 20px; text-align: center;">
              <div style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 10px 20px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                ${statusText}
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              
              <!-- Suspicion Score -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <h3 style="margin: 0 0 5px 0; color: #92400e; font-size: 14px; text-transform: uppercase;">Suspicion Score</h3>
                <p style="margin: 0; color: #78350f; font-size: 24px; font-weight: bold;">
                  ${data.suspicionScore}/100
                </p>
              </div>
              
              <!-- Game Details -->
              <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 4px;">
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Game Type</td>
                  <td style="padding: 12px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${this.formatGameType(data.gameType)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">User ID</td>
                  <td style="padding: 12px; color: #6b7280; font-family: monospace; font-size: 12px; border-bottom: 1px solid #e5e7eb;">${data.userId}</td>
                </tr>
                ${data.userEmail ? `
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">User Email</td>
                  <td style="padding: 12px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${data.userEmail}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Session ID</td>
                  <td style="padding: 12px; color: #6b7280; font-family: monospace; font-size: 12px; border-bottom: 1px solid #e5e7eb;">${data.sessionId}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Client Score</td>
                  <td style="padding: 12px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${data.clientScore.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Server Score</td>
                  <td style="padding: 12px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${data.serverScore.toLocaleString()}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px; font-weight: bold; color: #374151;">Timestamp</td>
                  <td style="padding: 12px; color: #6b7280;">${new Date(data.timestamp).toLocaleString()}</td>
                </tr>
              </table>
              
              <!-- Suspicion Reasons -->
              <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; text-transform: uppercase;">Detection Reasons</h3>
                <ul style="margin: 0; padding-left: 20px; color: #7f1d1d;">
                  ${data.suspicionReasons.map(reason => `<li style="margin-bottom: 5px;">${reason}</li>`).join('')}
                </ul>
              </div>
              
              <!-- Action Recommendation -->
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 14px; text-transform: uppercase;">Recommended Action</h3>
                <p style="margin: 0; color: #1e40af; line-height: 1.6;">
                  ${data.status === 'rejected' 
                    ? 'This session was automatically rejected due to high suspicion. Review user history and consider account restrictions.'
                    : 'This session was accepted but flagged. Monitor this user for repeated suspicious activity. Consider manual review if pattern continues.'}
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
                This is an automated alert from your Anti-Cheat System
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                Session ID: ${data.sessionId}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
  
  /**
   * Format game type for display
   */
  private static formatGameType(gameType: string): string {
    const gameNames: Record<string, string> = {
      'blade_bounce': '⚔️ Blade Bounce',
      'laser_dodge': '🚀 Laser Dodge',
      'multi_target': '🎯 Multi Target',
      'quick_click': '⚡ Quick Click',
      'sword_parry': '⚔️ Sword Parry',
      'color_sequence': '🧠 Color Sequence',
      'cash_stack': '💰 Cash Stack',
      'falling_objects': '📦 Falling Objects'
    };
    
    return gameNames[gameType] || gameType;
  }
}

