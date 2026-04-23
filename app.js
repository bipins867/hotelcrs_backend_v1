const express = require("express");
const logger = require("morgan");
const cors = require('cors');

const apiRouter = require("./routes/index");

const app = express();

// Allow CORS for all origins
app.use(cors({ origin: '*' }));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(logger("dev"));

// Increase body size limits for file uploads
// Default is 100kb, increasing to 50MB for JSON and URL-encoded
const maxBodySize = process.env.MAX_BODY_SIZE || '50mb';
app.use(express.json({ limit: maxBodySize })); // For JSON payloads
app.use(express.urlencoded({ extended: true, limit: maxBodySize })); // For form-data or URL-encoded bodies

// Mount API base route as /v1/api
app.use("/api/v1", apiRouter);

// Error handling
app.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});

module.exports = app;
