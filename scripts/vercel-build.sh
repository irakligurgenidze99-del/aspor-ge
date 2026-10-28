#!/usr/bin/env bash
# Vercel build: migrations → optional one-time seed → one-time content ops → Next.js build.
set -euo pipefail
npx prisma generate
npx prisma migrate deploy
if [ "${SEED_ON_BUILD:-0}" = "1" ] && [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "▶ SEED_ON_BUILD=1 — running idempotent seed (remove the variable after the first deploy)"
  npx tsx --conditions=react-server prisma/seed.ts
fi
if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "▶ content-ops (one-time content changes, each runs once)"
  npx tsx --conditions=react-server prisma/content-ops.ts
fi
npx next build
