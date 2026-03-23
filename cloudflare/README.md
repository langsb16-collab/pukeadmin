# Cloudflare Poker Admin Deployment Guide

This project is built with a Cloudflare-first architecture. While the current environment runs on Express + SQLite for development, the code is designed to be easily deployed to Cloudflare Workers and D1.

## Prerequisites
- [Cloudflare Account](https://dash.cloudflare.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed locally: `npm install -g wrangler`

## Deployment Steps

### 1. Create D1 Database
Run the following command to create your D1 database:
```bash
wrangler d1 create poker-db
```
Copy the `database_id` from the output and paste it into `cloudflare/wrangler.toml`.

### 2. Initialize Database Schema
Apply the schema to your D1 database:
```bash
wrangler d1 execute poker-db --file=./cloudflare/schema.sql
```

### 3. Deploy Worker
Deploy your API to Cloudflare Workers:
```bash
wrangler publish cloudflare/worker.ts
```

### 4. Update Frontend API URL
In `src/App.tsx`, update the `axios` base URL (or use an environment variable) to point to your deployed Worker URL:
`https://poker-api.your-subdomain.workers.dev`

## Architecture
- **Workers**: Serverless API handling authentication and management.
- **D1**: SQL database for persistent storage (users, games, admins).
- **Durable Objects**: (Optional) For real-time state synchronization across game tables.
- **React**: Modern dashboard for administrators.
