import amqp from 'amqplib';
import { createEntityInDatabase, updateEntityInDatabase, deleteEntityFromDatabase } from '../rabbitMq/handlerCRUDOperation.js';
import { handleCallback } from '../handler/notificationHandler.js';

/**
 * RabbitMQService class to manage interactions with RabbitMQ.
 */
class RabbitMQService {
  /**
   * Constructor to initialize RabbitMQService.
   * @param {string} connectionURL - URL of the RabbitMQ server.
   * @param {Object} models - Database models.
   * @param {Object} mailingService - Mailing service.
   * @param {Object} brevoMailingConfig - Brevo mailing configuration.
   * @param {Object} internalNotificationConfig - Internal notification configuration.
   * @param {Object} [logger=null] - Logger for logging purposes.
   * @param {boolean} [durable=true] - Whether exchanges and queues are durable.
   */
  constructor(connectionURL, models, mailingService, brevoMailingConfig, internalNotificationConfig, logger = null, durable = true) {
    console.log(models);
    this.mailingService = mailingService;
    this.connectionURL = connectionURL;
    this.models = models;
    this.brevoMailingConfig = brevoMailingConfig;
    this.internalNotificationConfig = internalNotificationConfig;
    this.connection = null;
    this.logger = logger;
    this.channel = null;
    this.exchangeDurable = durable;
    this.queueDurable = durable;
    this.ack = true; // Acknowledge messages by default to prevent message loss in case of error
  }

  /**
   * Connects to RabbitMQ server.
   */
  async connect() {
    try {
      this.connection = await amqp.connect(this.connectionURL);
      this.channel = await this.connection.createChannel();
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
    }
  }

  /**
   * Closes the RabbitMQ connection.
   */
  async close() {
    await this.channel.close();
    await this.connection.close();
  }

  /**
   * Verifies the subscriptions against the SMP events.
   * @param {Object} SMPevents - SMP events configuration.
   * @param {Object} muConsumers - Microservices consumers configuration.
   */
  async verifySubscriptions(SMPevents, muConsumers) {
    Object.keys(muConsumers).forEach(service => {
      Object.keys(muConsumers[service]).forEach(entity => {
        const operations = muConsumers[service][entity];
        if (!SMPevents[service] || !SMPevents[service][entity]) {
          console.warn(`[Warning]: No event configurations found for ${service}.${entity} in SMPevents.`);
        } else {
          const validOperations = SMPevents[service][entity];
          const invalidOps = operations.filter(op => !validOperations.includes(op));
          if (invalidOps.length > 0) {
            console.warn(`[Warning]: Invalid operations ${invalidOps.join(', ')} for ${service}.${entity} not supported by SMPevents.`);
          }
        }
      });
    });
    console.log("Verification of subscriptions completed.");
  }

  async subscribeTopic(exchangeTopic, routingKey, queueName, entityName, operation, handleCallback, data) {
    await this.channel.assertExchange(exchangeTopic, 'topic', { durable: this.exchangeDurable });
    await this.channel.assertQueue(queueName, { durable: this.queueDurable });
    await this.channel.bindQueue(queueName, exchangeTopic, routingKey);

    const notificationCrudEntities = ['User', 'UserOrganization', 'UserPreference'];
    const µservice = process.env.SMP_MU_SERVICE_NAME;
    this.channel.consume(queueName, async (receivedMsg) => {  // Added async to enable awaiting inside
        if (receivedMsg) {
            const messageData = JSON.parse(receivedMsg.content.toString());
            try {
                console.log(`Processing message with routingKey: ${routingKey} and messageData:`, messageData);

                const parsedData = JSON.parse(messageData.data);  // Parse the 'data' field
                const idField = entityName.charAt(0).toLowerCase() + entityName.slice(1) + 'ID';
                const model = this.models[entityName];

                // Ensuring CRUD operations are awaited
                if ((µservice !== 'notification') || notificationCrudEntities.includes(entityName)) {
                    switch (operation) {
                        case 'created':
                            await createEntityInDatabase(model, parsedData, parsedData[idField]);
                            break;
                        case 'updated':
                            await updateEntityInDatabase(model, parsedData, parsedData[idField]);
                            break;
                        case 'deleted':
                            await deleteEntityFromDatabase(model, parsedData[idField]);
                            break;
                    }
                }

                // Conditionally call handleCallback if the service is "notification"
                if (µservice === 'notification') {
                    await handleCallback(routingKey, messageData, this.mailingService, this.brevoMailingConfig, this.internalNotificationConfig, this.models.User, this.models.Notification);
                }

                console.log(`Processed message for ${entityName} with operation ${operation}:`, messageData);

                // Acknowledge the message
                this.channel.ack(receivedMsg);
            } catch (error) {
                console.error(`Error processing message for ${entityName}: ${error}`);
                // Nack the message and do not requeue
                this.channel.nack(receivedMsg, false, false); // nack with requeue set to false

                // Log the error or send a notification
                if (this.logger) {
                    this.logger.error(`Error processing message for ${entityName}: ${error}`);
                } else {
                    console.error(`Error processing message for ${entityName}: ${error}`);
                }
            }
        }
    }, { noAck: false });
}


  /**
   * Subscribes to a RabbitMQ direct exchange.
   * @param {string} exchange - Name of the direct exchange.
   * @param {string} routingKey - Routing key for the exchange.
   * @param {string} queueName - Name of the queue.
   * @param {Function} callback - Callback function to handle the message.
   */
  async subscribeDirect(exchange, routingKey, queueName, callback) {
    await this.channel.assertExchange(exchange, 'direct', { durable: this.exchangeDurable });
    await this.channel.assertQueue(queueName, { durable: this.queueDurable });
    await this.channel.bindQueue(queueName, exchange, routingKey);

    this.channel.consume(queueName, (receivedMsg) => {
      if (receivedMsg) {
        try {
          callback(receivedMsg.content);
          // Acknowledge the message
          this.channel.ack(receivedMsg);
        } catch (error) {
          console.error('Unable to read the message:', error);
          // Nack the message and do not requeue
          this.channel.nack(receivedMsg, false, false); // nack with requeue set to false

          // Log the error or send a notification
          if (this.logger) {
            this.logger.error('Msg lost:', receivedMsg);
          } else {
            console.error('Msg lost:', receivedMsg);
          }
        }
      }
    }, { noAck: false });
  }

  /**
   * Publishes a message to a RabbitMQ topic.
   * @param {string} exchangeTopic - Name of the topic exchange.
   * @param {string} routingKey - Routing key for the exchange.
   * @param {Object} message - Message to publish.
   * @param {Object} [context={}] - Context of the message.
   * @param {Object} [options={}] - Additional options for publishing.
   */
  async publishTopic(exchangeTopic, routingKey, message, context = {}, options = {}) {
    const messageWithContext = {
      context: context,
      data: message
    };
    const messageBuffer = Buffer.from(JSON.stringify(messageWithContext));

    await this.channel.assertExchange(exchangeTopic, 'topic', { durable: options.durable ?? this.exchangeDurable });
    this.channel.publish(exchangeTopic, routingKey, messageBuffer, options);
  }

  /**
   * Prepares to publish a message to a RabbitMQ topic by connecting, publishing, and closing the connection.
   * @param {string} exchangeTopic - Name of the topic exchange.
   * @param {string} routingKey - Routing key for the exchange.
   * @param {Object} message - Message to publish.
   * @param {Object} [context={}] - Context of the message.
   * @param {Object} [options={}] - Additional options for publishing.
   */
  async readyToPublishTopic(exchangeTopic, routingKey, message, context = {}, options = {}) {
    await this.connect();
    await this.publishTopic(exchangeTopic, routingKey, message, context, options);
    await this.close();
  }

  /**
   * Starts consumers for the specified microservices.
   * @param {Object} microservices - Configuration of microservices and their operations.
   */
  async startConsumers(microservices) {
    const µservice = process.env.SMP_MU_SERVICE_NAME;

    await this.connect();
    for (const [microserviceName, config] of Object.entries(microservices)) {
      for (const [entityName, operations] of Object.entries(config)) {
        for (const operation of operations) {
          const queueName = `${entityName}-${operation}-${µservice}-queue`;
          const routingKey = `${entityName}.${operation}`;
          const exchangeName = `${microserviceName}.events`;

          console.log(`Preparing to subscribe to queue ${queueName} ...`);

          // Pass handleCallback for notification service
          const callback = (µservice === 'notification') ? handleCallback : null;
          this.subscribeTopic(exchangeName, routingKey, queueName, entityName, operation, callback);
        }
      }
    }
    console.log("All consumers have been set up for all microservices.");
  }
}

export { RabbitMQService };
