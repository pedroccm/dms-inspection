# DMS Inspection - Project Guidelines

## Overview

Field inspection system for DMS Manutencao - Recloser (religador) inspection for Copel.
Tablet-first web application for field technicians.

## Language

- **UI language:** Portuguese (Brazilian)
- **Code comments:** English
- **Documentation:** Portuguese or English

## Tech Stack

- **Frontend:** Next.js 16 with App Router, TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL) - project `lbfkkteoiieraggbxgfc`
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage (inspection photos)
- **Deploy:** Netlify (dms-inspection.netlify.app)

## Database

- Supabase project: `lbfkkteoiieraggbxgfc.supabase.co`
- All tables should use a clear naming convention

## Git & GitHub

- **Repository:** https://github.com/pedroccm/dms-inspection
- **GitHub account:** `pedroccm`
- **Branch:** `main`

## Deploy

- **Platform:** Netlify
- **URL:** https://dms-inspection.netlify.app
- **Auto-deploy:** On push to `main`

## Versioning

- **Source of truth:** `package.json` field `"version"`
- **Every commit MUST bump the version** in `package.json`
- Follow **semver** (MAJOR.MINOR.PATCH):
  - PATCH: Bug fixes, small tweaks
  - MINOR: New features, new pages
  - MAJOR: Breaking changes (rare)

## Tailwind CSS v4

- Do NOT create `postcss.config.js` - Tailwind v4 does not need it
- Import via `@import "tailwindcss"` in globals.css
