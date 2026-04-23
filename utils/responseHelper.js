module.exports = {
  successResponse: (res, message, data = null, statusCode = 200) => {
    res.status(statusCode).json({
      status_code: statusCode,
      status: 'success',
      message,
      data
    });
  },

  errorResponse: (res, message = 'Something went wrong', error = null, statusCode = 500) => {
    res.status(statusCode).json({
      statusCode: statusCode,
      status: 'error',
      message: message,
      error: error
    });
  }
};
