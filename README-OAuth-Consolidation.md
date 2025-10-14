# GitHub OAuth Configuration Consolidation

This document describes the consolidated GitHub OAuth setup for the Docsify + DecapCMS project.

## Overview

Previously, GitHub OAuth secrets were scattered across multiple files:
- Hardcoded in `admin/config.yml`
- Hardcoded in `admin/index.html`
- Referenced in `auth-server.js` via environment variables
- Duplicated in multiple backup configuration files

## Current Consolidated Setup

### 1. Environment Variables (.env)
All OAuth secrets are now centralized in the `.env` file:
```env
GITHUB_CLIENT_ID=Ov23li5kbNATaXdde6rE
GITHUB_CLIENT_SECRET=your_github_client_secret_here
PORT=3000
NODE_ENV=development
```

### 2. Server Configuration (auth-server.js)
- Reads OAuth credentials from environment variables
- Provides `/api/config` endpoint to serve OAuth configuration to frontend
- Dynamically injects `GITHUB_CLIENT_ID` into the CMS config via `/api/admin/config`

### 3. CMS Configuration (admin/config.yml)
- Uses placeholder `{{GITHUB_CLIENT_ID}}` which gets replaced by the server
- No hardcoded secrets

### 4. Frontend (admin/index.html)
- Fetches OAuth configuration from `/api/config` endpoint
- No hardcoded secrets

## Benefits

1. **Single Source of Truth**: All OAuth secrets are managed in one place (`.env`)
2. **Security**: Secrets are no longer hardcoded in source files
3. **Environment Flexibility**: Easy to change secrets for different environments
4. **Maintenance**: Simplified configuration management

## Setup Instructions

1. Ensure `.env` file exists with proper `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
2. Start the server: `npm start`
3. Access the CMS at `http://localhost:3000/admin/`

## Files Changed

- ✅ `.env` - Added OAuth environment variables
- ✅ `auth-server.js` - Added dynamic configuration serving
- ✅ `admin/config.yml` - Replaced hardcoded client_id with placeholder
- ✅ `admin/index.html` - Updated to fetch config from server
- 🗑️ Removed redundant files:
  - `admin/config-local.yml`
  - `admin/config-token.yml` 
  - `admin/config.yml.backup`
  - `admin/index-auto.html`

## Security Note

Make sure to:
1. Never commit the actual `.env` file with real secrets to version control
2. Add `.env` to your `.gitignore` file
3. Use different OAuth apps for different environments (dev, staging, production)
