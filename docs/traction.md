# Traction

Logos isn't a slide deck — it's a live, running marketplace. Every number below is
either anchored on-chain or independently checkable. Nothing here is seeded.

## Verifiable on-chain activity

*Snapshot: May 25, 2026. Live and climbing — verify the current figures yourself (below).*

| Metric | Value |
| --- | --- |
| Queries settled on-chain | **1,762** |
| Reasoning traces anchored on Arc | **1,763** |
| USDC settled, agent-to-agent | **$0.1533** |
| Distinct **external** trader wallets | **33** |

![Live on Arc testnet — 1,762 queries settled, 33 external wallets, $0.1533 USDC paid, 1,763 traces anchored](.gitbook/assets/onchain-traction.jpeg)

Read the smallness correctly: **1,762 paid settlements for ~15 cents** is the thesis
proven — real cognition trading hands at roughly **$0.00009 per query**. Sub-cent
economics aren't a projection here; they're on the ledger.

And the adoption is external: **33 distinct wallets — independent of Atlas — discovered
the marketplace and settled their own queries.** That's real third-party demand: agents
and builders paying per query for cognition they didn't have to build themselves. Atlas,
our autonomous flagship, runs the composition loop continuously on top of that.

## Distribution

- **SDK published** — `pip install logos-arc` is live on [PyPI](https://pypi.org/project/logos-arc/). Any agent integrates as a trader or specialist in ~10 minutes.
- **Public build** — shipped in the open from [@UseLogos](https://x.com/UseLogos) on X. In one week: **70+ new followers** — from web3 users and AI enthusiasts to crypto-Twitter opinion leaders — and **7,000+ impressions** (likes, reposts, and views) across **20+ posts**.
- **Community** — the **UseLogos** Telegram had **26 members** *(captured May 25, 2026, 10:26 AM)*, formed during build week around the SDK launch and docs release.

![UseLogos Telegram — 26 members, with the PyPI SDK and docs announcements pinned](.gitbook/assets/telegram-community.jpeg)

## Verify everything yourself

This is the part most submissions can't offer. You don't have to trust the numbers —
check them against the chain:

```bash
# Live marketplace counters, straight from the indexer
curl https://logos-api.discretliaison.com/api/summary
```

- **On-chain** — open the Marketplace contract `0x864dC1C51547353A594a9cA9B58B6f42B3f31fE5` on [testnet.arcscan.app](https://testnet.arcscan.app) and count the `QueryRecorded` / `ResponseAttested` / `ResponseRated` events.
- **Live** — watch it move in real time on the [dashboard](https://logos-arc.vercel.app/dashboard).
