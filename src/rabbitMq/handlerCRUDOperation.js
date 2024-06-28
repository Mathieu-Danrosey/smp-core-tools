/**
 * Database entity management module
 */

/**
 * Updates an entity in the database.
 * @param {string} entityName - The name of the entity to update.
 * @param {Object} updateData - The data to update the entity with.
 * @param {number} entityId - The ID of the entity to update.
 * @returns {Promise<Object>} A promise resolved with the updated entity.
 * @throws {Error} If the entity ID is not provided or the entity is not found.
 */
async function updateEntityInDatabase(entityName, updateData, entityId) {
  if (!entityId) {
    throw new Error('No entity ID provided for update.', { statusCode: 400 });
  }

  const entity = await entityName.findByPk(entityId);
  if (!entity) {
    throw new Error(`Entity not found with ID: ${entityId}`, { statusCode: 404 });
  }

  try {
    const updatedEntity = await entity.update(updateData);
    return updatedEntity;
  } catch (error) {
    throw new Error(`Failed to update entity: ${error.message}`, { statusCode: 500 });
  }
}

/**
 * Creates a new entity in the database.
 * @param {string} entityName - The name of the entity to create.
 * @param {Object} entityData - The data of the entity to create.
 * @returns {Promise<Object>} A promise resolved with the newly created entity.
 * @throws {Error} If the entity name or data is not provided, or if an entity with the same ID already exists.
 */
async function createEntityInDatabase(entityName, entityData) {
  if (!entityName) {
    throw new Error('Entity name not provided.', { statusCode: 400 });
  }
  if (!entityData) {
    throw new Error('Entity data not provided.', { statusCode: 400 });
  }

  try {
    const existingEntity = await entityName.findByPk(entityData.id);
    if (existingEntity) {
      throw new Error('Entity with the same ID already exists.', { statusCode: 409 });
    }

    const newEntity = await entityName.create(entityData);
    return newEntity;
  } catch (error) {
    throw new Error(`Failed to create entity: ${error.message}`, { statusCode: 500 });
  }
}

/**
 * Deletes an entity from the database.
 * @param {string} entityName - The name of the entity to delete.
 * @param {number} entityId - The ID of the entity to delete.
 * @returns {Promise<Object>} A promise resolved with an object indicating the success of the deletion.
 * @throws {Error} If the entity is not found.
 */
async function deleteEntityFromDatabase(entityName, entityId) {
  if (!entityId) {
    throw new Error('No entity ID provided for deletion.', { statusCode: 400 });
  }

  try {
    const entity = await entityName.findByPk(entityId);
    if (!entity) {
      throw new Error(`Entity not found with ID: ${entityId}`, { statusCode: 404 });
    }

    await entity.destroy();
    return { success: true, message: 'Entity deleted successfully' };
  } catch (error) {
    throw new Error(`Failed to delete entity: ${error.message}`, { statusCode: 500 });
  }
}

export { updateEntityInDatabase, createEntityInDatabase, deleteEntityFromDatabase };