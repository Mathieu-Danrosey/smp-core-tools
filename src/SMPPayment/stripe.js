/**
 * Stripe Utilities class for creating and managing Stripe customers, products, and prices.
 * 
 * @author Services
 * @copyright 
 * Services, registered in France
 * 2023 Services. All rights reserved.
 * 
 * This software is the confidential and proprietary information of Services.
 * You shall not disclose such Confidential Information and shall use it only in
 * accordance with the terms of the agreement between you and Services.
 */
class StripeUtils {
  /**
   * Creates a new Stripe customer.
   * 
   * @param {string} email - The customer's email address.
   * @param {string} name - The customer's full name.
   * @param {number} userId - The user ID associated with the customer.
   * 
   * @returns {string} The ID of the created Stripe customer.
   * 
   * @throws {Error} If the Stripe customer creation fails.
   */
  static async createCustomer(email, name, userId) {
    // Input validation
    if (!email || !name || !userId) {
      throw new Error('All input parameters are required');
    }
    if (typeof email !== 'string' || typeof name !== 'string' || typeof userId !== 'number') {
      throw new Error('Invalid input parameter type');
    }

    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { userId },
      });
      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Creates a new Stripe customer and updates the user preferences.
   * 
   * @param {Object} User - The User model.
   * @param {Object} Profile - The Profile model.
   * @param {Object} UserPreferences - The UserPreferences model.
   * @param {number} userID - The user ID.
   * 
   * @returns {Object} An object containing the Stripe customer ID.
   * 
   * @throws {Error} If the Stripe customer creation or user preferences update fails.
   */
  static async createStripeCustomer(User, Profile, UserPreferences, userID) {
    // Input validation
    if (!User || !Profile || !UserPreferences || !userID) {
      throw new Error('All input parameters are required');
    }
    if (typeof User !== 'object' || typeof Profile !== 'object' || typeof UserPreferences !== 'object' || typeof userID !== 'number') {
      throw new Error('Invalid input parameter type');
    }

    try {
      const user = await User.findByPk(userID);
      if (!user) {
        throw new Error("User not found");
      }

      const profile = await Profile.findByPk(user.profileID);
      if (!profile) {
        throw new Error('Profile not found for the user');
      }

      const stripeCustomer = await this.createCustomer(
        user.email,
        `${profile.firstName} ${profile.lastName}`,
        user.id
      );

      const userPreferences = await UserPreferences.findOne({ where: { userID: userID } });
      if (!userPreferences) {
        throw new Error("UserPreferences not found for the user");
      }

      const otherSettings = userPreferences.otherSettings ? JSON.parse(userPreferences.otherSettings) : {};
      otherSettings.stripeCustomerId = stripeCustomer;
      userPreferences.otherSettings = JSON.stringify(otherSettings);

      await userPreferences.save();

      return { stripeCustomerId: stripeCustomer };
    } catch (error) {
      console.error("Error creating Stripe customer or updating UserPreferences:", error);
      throw error;
    }
  }

  /**
   * Creates or updates a Stripe product.
   * 
   * @param {Object} service - The service object.
   * 
   * @returns {string} The ID of the created or updated Stripe product.
   * 
   * @throws {Error} If the Stripe product creation or update fails.
   */
  static async getOrCreateStripeProduct(service) {
    // Input validation
    if (!service) {
      throw new Error('Service object is required');
    }
    if (typeof service !== 'object') {
      throw new Error('Invalid service object type');
    }

    try {
      const advancedAttributes = service.advancedAttributes ? JSON.parse(service.advancedAttributes) : {};
      let productID = advancedAttributes.stripeProductID;

      if (productID) {
        // Update the product details if needed
        await stripe.products.update(productID, {
          name: service.title,
          description: service.description,
        });
      } else {
        const product = await stripe.products.create({
          name: service.title,
          description: service.description,
        });
        productID = product.id;
        advancedAttributes.stripeProductID = productID;
        service.advancedAttributes = JSON.stringify(advancedAttributes);
        await service.save();
      }

      return productID;
    } catch (error) {
      console.error('Error creating or updating Stripe product:', error);
      throw error;
    }
  }

  /**
   * Creates or updates a Stripe price.
   * 
   * @param {Object} Service - The Service model.
   * @param {number} serviceID - The service ID.
   * 
   * @returns {Object} An object containing the Stripe product ID and price ID.
   * 
   * @throws {Error} If the Stripe price creation or update fails.
   */
  static async createOrUpdateStripePrice(Service, serviceID) {
    // Input validation
    if (!Service || !serviceID) {
      throw new Error('All input parameters are required');
    }
    if (typeof Service !== 'object' || typeof serviceID !== 'number') {
      throw new Error('Invalid input parameter type');
    }

    try {
      const service = await Service.findByPk(serviceID);
      if (!service) {
        throw new Error('Service not found');
      }

      const productID = await this.getOrCreateStripeProduct(service);

      const priceData = await stripe.prices.create({
        unit_amount: service.price * 100, // Stripe expects the price in cents
        currency: 'usd', // Change the currency as needed
        product: productID,
      });

      const advancedAttributes = service.advancedAttributes ? JSON.parse(service.advancedAttributes) : {};
      advancedAttributes.stripePriceID = priceData.id;
      service.advancedAttributes = JSON.stringify(advancedAttributes);

      await service.save();

      return { stripeProductID: productID, stripePriceID: priceData.id };
    } catch (error) {
      console.error('Error creating or updating Stripe price:', error);
      throw error;
    }
  }

  /**
   * Creates a new Stripe payment method.
   * 
   * @param {string} cardNumber - The card number.
   * @param {number} expMonth - The expiration month.
   * @param {number} expYear - The expiration year.
   * @param {string} cvc - The CVC code.
   * 
   * @returns {string} The ID of the created Stripe payment method.
   * 
   * @throws {Error} If the Stripe payment method creation fails.
   */
  static async createPaymentMethod(cardNumber, expMonth, expYear, cvc) {
    // Input validation
    if (!cardNumber || !expMonth || !expYear || !cvc) {
      throw new Error('All input parameters are required');
    }
    if (typeof cardNumber !== 'string' || typeof expMonth !== 'number' || typeof expYear !== 'number' || typeof cvc !== 'string') {
      throw new Error('Invalid input parameter type');
    }

    try {
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardNumber,
          exp_month: expMonth,
          exp_year: expYear,
          cvc: cvc,
        },
      });
      return paymentMethod.id;
    } catch (error) {
      console.error('Error creating Stripe payment method:', error);
      throw error;
    }
  }

  /**
   * Creates a new Stripe payment intent.
   * 
   * @param {string} token - The payment method token.
   * @param {number} amount - The payment amount.
   * @param {string} currency - The payment currency.
   * @param {string} description - The payment description.
   * 
   * @returns {Object} The created Stripe payment intent.
   * 
   * @throws {Error} If the Stripe payment intent creation fails.
   */
  static async createPaymentIntent(token, amount, currency, description) {
    // Input validation
    if (!token || !amount || !currency || !description) {
      throw new Error('All input parameters are required');
    }
    if (typeof token !== 'string' || typeof amount !== 'number' || typeof currency !== 'string' || typeof description !== 'string') {
      throw new Error('Invalid input parameter type');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        payment_method: token,
        description: description,
        confirm: true,
      });
      return paymentIntent;
    } catch (error) {
      console.error('Error creating Stripe payment intent:', error);
      throw error;
    }
  }
  /**
   * Processes a payment using a Stripe payment intent.
   * 
   * @param {string} token - The payment method token.
   * @param {number} amount - The payment amount.
   * @param {string} currency - The payment currency.
   * @param {string} description - The payment description.
   * 
   * @returns {Object} The processed payment intent.
   * 
   * @throws {Error} If the payment processing fails.
   */
  static async processPayment(token, amount, currency, description) {
    // Input validation
    if (!token || !amount || !currency || !description) {
      throw new Error('All input parameters are required');
    }
    if (typeof token !== 'tring' || typeof amount !== 'number' || typeof currency !== 'tring' || typeof description !== 'tring') {
      throw new Error('Invalid input parameter type');
    }

    try {
      const paymentIntent = await this.createPaymentIntent(token, amount, currency, description);
      return paymentIntent;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Refunds a payment using a Stripe payment intent.
   * 
   * @param {string} paymentIntentID - The ID of the payment intent to refund.
   * 
   * @returns {Object} The refund object.
   * 
   * @throws {Error} If the refund fails.
   */
  static async refundPayment(paymentIntentID) {
    // Input validation
    if (!paymentIntentID) {
      throw new Error('Payment intent ID is required');
    }
    if (typeof paymentIntentID !== 'tring') {
      throw new Error('Invalid payment intent ID type');
    }

    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentID,
      });
      return refund;
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }
}

export { StripeUtils };