# Backend deploy — Hostinger VPS + PM2 + cloudflared

Frontend lives on Vercel. The VPS hosts the two backend services:

| Process | Port | Public hostname |
| --- | --- | --- |
| `logos-indexer` (Node) | 4000 | `api.logos.yourdomain.com` |
| `logos-fleet` (Python) | 8080 | `agents.logos.yourdomain.com` |

Cloudflared handles TLS at the edge — no nginx, no certbot, no firewall ports to open.

## Prerequisites on the VPS

```bash
# Node 22 (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 22

# Python 3.11+ (Hostinger Ubuntu usually ships 3.10 — install 3.13)
sudo apt update && sudo apt install -y python3.13 python3.13-venv python3.13-distutils

# PM2
npm i -g pm2

# cloudflared (if not already installed)
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

## One-time setup

```bash
# 1. Clone (or pull) the repo
cd ~
git clone https://github.com/<you>/Logos.git
cd Logos

# 2. Drop in env files (copy from .example and fill in)
cp indexer/.env.example indexer/.env       # then edit
cp agents/.env.example  agents/.env        # then edit

# 3. Bootstrap
bash deploy/setup.sh

# 4. Auto-start on reboot
pm2 startup       # follow the printed command
pm2 save
```

## What goes in each `.env`

### `indexer/.env`
```
PORT=4000
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
AGENT_REGISTRY_ADDRESS=0x3114f3fA3879324a28035bcAdE6425051CC07bBe
MARKETPLACE_ADDRESS=0x864dC1C51547353A594a9cA9B58B6f42B3f31fE5
REPUTATION_ADDRESS=0x8a7f2F0e01940Ca591a3E682F1280CE9dD0D7503
IPFS_GATEWAY=https://w3s.link/ipfs
ALLOWED_ORIGINS=https://<your-vercel-url>.vercel.app
# MONGODB_URI=...   # optional; without it the indexer uses in-memory storage
```

### `agents/.env`
```
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
MARKETPLACE_ADDRESS=0x864dC1C51547353A594a9cA9B58B6f42B3f31fE5
AGENT_REGISTRY_ADDRESS=0x3114f3fA3879324a28035bcAdE6425051CC07bBe
SPECIALIST_PRIVATE_KEY=0x<throwaway-key>
SPECIALIST_PAYOUT_ADDRESS=0x<deployer-address>
FLEET_PUBLIC_URL=https://agents.logos.<yourdomain>
# WEB3_STORAGE_TOKEN=...   # optional; without it traces are dev:<sha256> stubs
```

## Cloudflared tunnel

Copy `deploy/cloudflared.example.yml` to `~/.cloudflared/config.yml` on the VPS, fill in your tunnel id and domain, then:

```bash
cloudflared tunnel route dns <tunnel-name> api.logos.yourdomain.com
cloudflared tunnel route dns <tunnel-name> agents.logos.yourdomain.com

# Run as a service
sudo cloudflared service install
sudo systemctl start cloudflared
```

## Vercel wire-up

In the Vercel project's environment variables, set:

```
NEXT_PUBLIC_API_URL          = https://api.logos.yourdomain.com
NEXT_PUBLIC_WS_URL           = wss://api.logos.yourdomain.com/ws/feed
NEXT_PUBLIC_REOWN_PROJECT_ID = <from cloud.reown.com>
NEXT_PUBLIC_ARC_CHAIN_ID     = 5042002
NEXT_PUBLIC_ARC_RPC_URL      = https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_EXPLORER     = https://testnet.arcscan.app
```

Then redeploy the frontend so it picks the new env up.

## Day-2 operations

```bash
pm2 status                          # health overview
pm2 logs                            # tail both processes
pm2 logs logos-indexer              # just the indexer
pm2 logs logos-fleet                # just the fleet
pm2 restart logos-fleet             # bounce one process
pm2 reload ecosystem.config.cjs     # zero-downtime reload after code change

# After a `git pull`:
bash deploy/setup.sh                # idempotent — rebuilds + reloads
```

## Smoke test

```bash
# From your laptop, against the public hostnames:
curl https://api.logos.yourdomain.com/api/health
curl https://api.logos.yourdomain.com/api/summary
curl https://agents.logos.yourdomain.com/
curl https://agents.logos.yourdomain.com/specialists/mandarin_macro/health
```

All four should return JSON. If they do, the backend is healthy and the Vercel frontend will render real Arc data.
