/**
 * Factory class for creating mailing service instances based on environment configuration.
 * 
 * @author Services
 * @copyright Services, registered in France
 */
class MailingServiceFactory {
  /**
   * Creates a mailing service instance based on environment configuration.
   * 
   * @param {string} apiKey - The API key for the mailing service.
   * @param {Object} brevoMailingConfig - The Brevo mailing configuration.
   * @param {Object} internalNotificationConfig - The internal notification configuration.
   * 
   * @returns {MailingService} The created mailing service instance.
   * 
   * @throws {Error} If the MAIL_SERVICE environment variable is not set or invalid.
   */
  static createMailingService(apiKey, brevoMailingConfig, internalNotificationConfig) {
    // Input validation
    if (!apiKey || !brevoMailingConfig || !internalNotificationConfig) {
      throw new Error('All input parameters are required');
    }
    if (typeof apiKey !== 'string' || typeof brevoMailingConfig !== 'object' || typeof internalNotificationConfig !== 'object') {
      throw new Error('Invalid input parameter type');
    }

    // Environment variable validation
    const mailService = process.env.MAIL_SERVICE;
    if (!mailService) {
      throw new Error('MAIL_SERVICE environment variable is not set');
    }

    console.log(`Creating Mailing Service with: ${apiKey}, ${brevoMailingConfig}, ${internalNotificationConfig}`);

    switch (mailService) {
      case 'Brevo':
        return new BrevoMailingService(apiKey, brevoMailingConfig);
      default:
        // SMTP configuration
        const smtpConfig = {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT, 10),
          secure: process.env.SMTP_SECURE === 'true', // Convert string to boolean
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        };

        // Input validation for SMTP configuration
        if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.auth || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
          throw new Error('SMTP configuration is incomplete or invalid');
        }

        return new SMTPMailingService(smtpConfig);
    }
  }
}

export { MailingServiceFactory };