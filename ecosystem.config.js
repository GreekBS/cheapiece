/**
 * PM2: product-stats-worker (single process, fork mode)
 *
 * Approved production defaults: instances = 1, max_memory_restart 512MB,
 * stdout/stderr captured to logs/pm2/out.log and error.log (no HTTP health in deploy layer).
 *
 * Secrets: host env / systemd EnvironmentFile / worker loads repo-root .env|.env.local at runtime.
 */
const path = require("path");

const logDir = path.join(__dirname, "logs", "pm2");

module.exports = {
  apps: [
    {
      name: "product-stats-worker",
      script: path.join(__dirname, "worker", "product-stats-worker.js"),
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,

      max_memory_restart: "512M",

      kill_timeout: 20_000,
      shutdown_with_message: true,

      max_restarts: 30,
      min_uptime: "5s",
      exp_backoff_restart_delay: 500,
      restart_delay: 2_000,

      merge_logs: false,
      time: true,
      log_date_format: "YYYY-MM-DDTHH:mm:ss.SSSZ",

      error_file: path.join(logDir, "error.log"),
      out_file: path.join(logDir, "out.log"),

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
