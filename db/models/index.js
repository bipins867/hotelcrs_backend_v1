'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const { logDataChange } = require('../../utils/dataLogger');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Helper function to extract user ID from various sources
const extractUserId = (instance, options) => {
  // Priority 1: Direct userId in options
  if (options && options.userId) {
    return options.userId;
  }
  
  // Priority 2: From instance fields (createdBy/updatedBy)
  if (instance) {
    if (instance.updatedBy) return instance.updatedBy;
    if (instance.createdBy) return instance.createdBy;
  }
  
  // Priority 3: From transaction context
  if (options && options.transaction && options.transaction.userId) {
    return options.transaction.userId;
  }
  
  // Priority 4: From request context (if available)
  if (options && options.req && options.req.user && options.req.user.id) {
    return options.req.user.id;
  }
  
  return null;
};

// Helper function to safely get instance data
const getInstanceData = (instance) => {
  try {
    return instance ? instance.toJSON() : null;
  } catch (error) {
    console.error('Error getting instance data:', error.message);
    return null;
  }
};

// Apply logging hooks to all models except DataLog
for (const modelName in db) {
  const model = db[modelName];

  // Skip DataLog model to avoid infinite recursion
  if (modelName === 'DataLog') continue;

  // CREATE operation logging
  model.addHook('afterCreate', async (instance, options) => {
    try {
      const userId = extractUserId(instance, options);
      
      await logDataChange({
        tableName: model.tableName,
        operation: 'CREATE',
        recordId: instance.id,
        dataBefore: null,
        dataAfter: getInstanceData(instance),
        userId: userId,
        DataLogModel: db.DataLog,
      });
    } catch (error) {
      console.error(`Error in afterCreate hook for ${modelName}:`, error.message);
    }
  });

  // UPDATE operation logging
  model.addHook('beforeUpdate', async (instance, options) => {
    try {
      // Store the previous state for comparison
      const previous = await model.findByPk(instance.id);
      options._dataBefore = getInstanceData(previous);
    } catch (error) {
      console.error(`Error in beforeUpdate hook for ${modelName}:`, error.message);
      options._dataBefore = null;
    }
  });

  model.addHook('afterUpdate', async (instance, options) => {
    try {
      const userId = extractUserId(instance, options);
      
      await logDataChange({
        tableName: model.tableName,
        operation: 'UPDATE',
        recordId: instance.id,
        dataBefore: options._dataBefore,
        dataAfter: getInstanceData(instance),
        userId: userId,
        DataLogModel: db.DataLog,
      });
    } catch (error) {
      console.error(`Error in afterUpdate hook for ${modelName}:`, error.message);
    }
  });

  // DELETE operation logging
  model.addHook('beforeDestroy', async (instance, options) => {
    try {
      const userId = extractUserId(instance, options);
      
      await logDataChange({
        tableName: model.tableName,
        operation: 'DELETE',
        recordId: instance.id,
        dataBefore: getInstanceData(instance),
        dataAfter: null,
        userId: userId,
        DataLogModel: db.DataLog,
      });
    } catch (error) {
      console.error(`Error in beforeDestroy hook for ${modelName}:`, error.message);
    }
  });

  // BULK DELETE operation logging (for bulk operations)
  model.addHook('beforeBulkDestroy', async (options) => {
    try {
      const userId = extractUserId(null, options);
      
      // Get all records that will be deleted
      const recordsToDelete = await model.findAll({
        where: options.where,
        raw: true
      });
      
      // Log each deletion
      for (const record of recordsToDelete) {
        await logDataChange({
          tableName: model.tableName,
          operation: 'DELETE',
          recordId: record.id,
          dataBefore: record,
          dataAfter: null,
          userId: userId,
          DataLogModel: db.DataLog,
        });
      }
    } catch (error) {
      console.error(`Error in beforeBulkDestroy hook for ${modelName}:`, error.message);
    }
  });
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
