/**
 * Brevo Mailing Service
 * 
 * This class provides a secure and reliable way to send emails using the Brevo API.
 * 
 * @author Services 
 * @version 1.0
 */
class BrevoMailingService extends MailingService {
  /**
   * Constructor
   * 
   * Initializes a new instance of the BrevoMailingService class.
   * 
   * @param {string} apiKey - The API key for authenticating requests to the Brevo API.
   * @param {Object} brevoMailingConfig - The configuration for the Brevo mailing service.
   */
  constructor(apiKey, brevoMailingConfig) {
    super(); // Call the parent constructor
    this.apiKey = apiKey; // Store the API key securely
    this.brevoMailingConfig = brevoMailingConfig; // Store the configuration securely
  }

  /**
   * Send Email
   * 
   * Sends an email using the Brevo API.
   * 
   * @param {Object} payload - The payload for the email, including the recipient, subject, and body.
   * @returns {Promise<void>} - A promise that resolves when the email is sent successfully.
   * @throws {Error} - An error if the email cannot be sent.
   */
  async sendMail(payload) {
    try {
      // Validate the payload to ensure it meets the expected format and structure
      this.validatePayload(payload);

      // Create a secure request to the Brevo API
      const request = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey // Use the stored API key
        },
        body: JSON.stringify(payload)
      };

      // Send the request to the Brevo API
      const response = await fetch('https://api.brevo.com/v3/smtp/email', request);

      // Check the response status code
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Log the response body for debugging purposes
      console.log('Response Body:', await response.text());

      // Return a success message
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      // Log the error for debugging purposes
      console.error('Failed to send email via Brevo API:', error);

      // Throw an error if the email cannot be sent
      throw error;
    }
  }

  /**
   * Validate Payload
   * 
   * Validates the payload to ensure it meets the expected format and structure.
   * 
   * @param {Object} payload - The payload to validate.
   * @throws {Error} - An error if the payload is invalid.
   */
  validatePayload(payload) {
    // Check if the payload is an object
    if (typeof payload !== 'object') {
      throw new Error('Invalid payload. Payload must be an object.');
    }

    // Check if the payload has the required properties
    if (!payload.recipient || !payload.subject || !payload.body) {
      throw new Error('Invalid payload. Payload must have recipient, subject, and body properties.');
    }

    // Check if the payload properties are valid
    if (typeof payload.recipient !== 'string' || typeof payload.subject !== 'string' || typeof payload.body !== 'string') {
      throw new Error('Invalid payload. Payload properties must be strings.');
    }

    // Check if the recipient is a valid email address
    if (!this.isValidEmail(payload.recipient)) {
      throw new Error('Invalid recipient. Recipient must be a valid email address.');
    }
  }

  /**
   * Is Valid Email
   * 
   * Checks if the provided email address is valid.
   * 
   * @param {string} email - The email address to validate.
   * @returns {boolean} - True if the email address is valid, false otherwise.
   */
  isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
}

export { BrevoMailingService };