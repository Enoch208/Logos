// PM2 ecosystem for the Logos backend on a single VPS.
//
// Two processes (the frontend lives on Vercel):
//   - indexer  : Node REST + WS on :4000  (chain poller against Arc testnet)
//   - fleet    : Python FastAPI on :8080  (8 specialists mounted as sub-apps)
//
// Cloudflared (run separately) maps each port to a public hostname behind
// Cloudflare-managed TLS, so no firewall ports need to be opened on the VPS.
// See deploy/cloudflared.example.yml for the ingress rules.
//
// Usage:
//   pm2 start ecosystem.config.cjs --env production
//   pm2 save
//   pm2 startup           # to survive reboots

module.exports = {
  apps: [
    {
      name: "logos-indexer",
      cwd: "./indexer",
      script: "dist/index.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "4000",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: "4000",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
      max_memory_restart: "400M",
      kill_timeout: 5000,
      out_file: "./logs/indexer.out.log",
      error_file: "./logs/indexer.err.log",
      merge_logs: true,
      time: true,
    },

    {
      name: "logos-fleet",
      cwd: "./agents",
      // Launcher cd's to agents/ and exec's the venv's python — sidesteps
      // PM2's flaky relative interpreter resolution. PM2 runs the .sh via
      // its default shell, no `interpreter` field needed.
      script: "./scripts/run_fleet.sh",
      env: {
        PORT: "8080",
        PYTHONUNBUFFERED: "1",
      },
      env_production: {
        PORT: "8080",
        PYTHONUNBUFFERED: "1",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 6000,
      max_memory_restart: "600M",
      kill_timeout: 8000,
      out_file: "./logs/fleet.out.log",
      error_file: "./logs/fleet.err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
