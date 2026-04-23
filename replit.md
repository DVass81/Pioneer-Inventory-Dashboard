# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
Also includes a standalone Python Streamlit app for deployment on Streamlit Cloud.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

- `artifacts/pioneer-dashboard` — React + Vite frontend dashboard (Pioneer green/beige branding)
- `artifacts/api-server` — Express 5 API server with inventory and release request endpoints

## Streamlit App

- Location: `streamlit-app/`
- Main file: `streamlit-app/app.py`
- Connects to the same PostgreSQL database as the Replit version
- Deploy to Streamlit Cloud: push `streamlit-app/` to GitHub, connect at share.streamlit.io
- Required secret: `DATABASE_URL`
- Optional secrets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` for email notifications

## Database Schema

- `inventory_items` — mica sheets (AVSM/AVMM with thickness, sheet size, weight per sheet), PEI Tape, Cold Banding Tape, Brazing Wire
- `release_requests` — release requests with status tracking and email notifications to Pioneer team

## Pioneer Email Recipients (hardwired)

- Taylor.vincent@pioneerindustrialsales.com
- shane.parks@pioneerindustrialsales.com
- paul.hester@pioneerindustrialsales.com
- hank.pennington@pioneerindustrialsales.com

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
