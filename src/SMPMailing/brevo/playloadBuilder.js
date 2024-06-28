/**
 * Generates the payload for sending an email via Brevo based on user data and template configuration.
 * 
 * @author Services
 * @copyright Services, registered in France
 * 
 * @param {Object} user - The user to notify.
 * @param {string} subject - The email subject.
 * @param {number} templateId - The ID of the Brevo template to use.
 * @param {Object} params - Template-specific parameters.
 * 
 * @returns {Object} The formatted payload for the Brevo API.
 * 
 * @throws {Error} If any of the input parameters are invalid or missing.
 */
function generatePayloadForUser(user, subject, templateId, params) {
  // Input validation
  if (!user || !subject || !templateId || !params) {
    throw new Error('All input parameters are required');
  }
  if (typeof user !== 'object' || typeof subject !== 'string' || typeof templateId !== 'number' || typeof params !== 'object') {
    throw new Error('Invalid input parameter type');
  }
  if (!user.email || !user.name || !user.username) {
    throw new Error('User object must contain email, name, and username properties');
  }

  // Sanitize user input
  const sanitizedUserEmail = sanitizeEmail(user.email);
  const sanitizedUserName = sanitizeString(user.name || user.username || 'User');

  // Generate payload
  return {
    sender: {
      email: "leonceyopa@gmail.com",
      name: "SERVICES",
    },
    to: [
      {
        email: sanitizedUserEmail,
        name: sanitizedUserName,
      },
    ],
    subject: subject,
    templateId: templateId,
    params: {
      ...params,
      userName: sanitizedUserName, // Add user name to template parameters
    },
  };
}

/**
 * Sanitizes an email address to prevent email injection attacks.
 * 
 * @param {string} email - The email address to sanitize.
 * @returns {string} The sanitized email address.
 */
function sanitizeEmail(email) {
  return email.replace(/[^a-zA-Z0-9._%+-]+/g, '');
}

/**
 * Sanitizes a string to prevent XSS attacks.
 * 
 * @param {string} str - The string to sanitize.
 * @returns {string} The sanitized string.
 */
function sanitizeString(str) {
  return str.replace(/[^a-zA-Z0-9 _.-]+/g, '');
}

export { generatePayloadForUser };