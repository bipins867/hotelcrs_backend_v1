const path = require('path');

// ensure base dir is repo root if needed
process.chdir(path.resolve(__dirname, '..'));

const scheduler = require('./index');

(async () => {
  try {
    // call init to register schedules
    scheduler.init();
    console.log('Scheduler initialized. PID:', process.pid);

    // keep the process alive — node-cron schedules run while process lives.
    // The code below prevents the process from exiting if nothing else is running:
    process.stdin.resume();

    // optional: graceful shutdown
    const shutdown = (sig) => {
      console.log(`Received ${sig}, shutting down scheduler...`);
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Scheduler failed to start:', err);
    process.exit(1);
  }
})();
