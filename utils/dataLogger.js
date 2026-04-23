async function logDataChange({ tableName, operation, recordId, dataBefore, dataAfter, userId = null, DataLogModel = null }) {
  try {
    // Validate required parameters
    if (!tableName || !operation || !recordId) {
      console.error('Missing required parameters for data logging:', { tableName, operation, recordId });
      return;
    }

    // Validate operation type
    const validOperations = ['CREATE', 'UPDATE', 'DELETE'];
    if (!validOperations.includes(operation)) {
      console.error('Invalid operation type:', operation);
      return;
    }

    // Check if DataLogModel is provided
    if (!DataLogModel) {
      console.error('DataLogModel is required for data logging');
      return;
    }

    // Create the log entry
    await DataLogModel.create({
      tableName,
      operation,
      recordId,
      dataBefore: dataBefore ? JSON.stringify(dataBefore) : null,
      dataAfter: dataAfter ? JSON.stringify(dataAfter) : null,
      createdBy: userId,
    });

    // Optional: Log to console for debugging (can be disabled in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`DataLog: ${operation} on ${tableName} (ID: ${recordId}) by user: ${userId || 'unknown'}`);
    }
  } catch (err) {
    console.error('Data logging failed:', {
      DataLogModel: DataLogModel ? 'provided' : 'missing',
      error: err.message,
      tableName,
      operation,
      recordId,
      userId
    });
  }
}

module.exports = { logDataChange };
