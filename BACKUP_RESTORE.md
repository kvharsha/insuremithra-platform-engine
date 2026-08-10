# Backup & Restore Guide

This document describes the backup and restore functionality for InsureMithra.

Overview
- Automatic backups run daily at midnight server time (00:00) via `node-cron`.
- Backups include MongoDB dump and the `uploads/` folder.
- Backups are stored in `./backups` as `db-YYYYMMDD-HHMM.tar.gz`.
- The system retains the latest 3 backups; older backups are removed automatically.

Commands
- Trigger manual backup (admin API):
  - `POST /api/admin/backups/run` (authorized admin)
- List backups (admin API):
  - `GET /api/admin/backups` (authorized admin)
- Restore backup (admin API):
  - `POST /api/admin/backups/restore` with JSON body `{ "backupName": "db-YYYYMMDD-HHMM.tar.gz" }`

Verification
- To verify last 3 backups can be restored, run:
  - `npm run verify:backups`
- The script will restore each of the last 3 backups into a temporary database `insuremithra_restore_test` and run basic sanity checks (users > 0, policies > 0, purchases > 0).

Pre-deployment checklist
- Ensure `mongodump` and `mongorestore` are installed and available in PATH on the target machine.
- Ensure `MONGO_URI` or `MONGODB_URI` environment variable is set and points to the MongoDB server.
- Ensure the process has write permissions to the project directory (to create `backups/` and `logs/`).
- Consider storing backups off-host (S3, remote filesystem) for production resilience.

Notes
- The restore operation overwrites data. Only administrators should perform restores and ideally perform them in maintenance windows.
- The scheduler can be disabled via `DISABLE_BACKUP_SCHEDULER=true` environment variable.
