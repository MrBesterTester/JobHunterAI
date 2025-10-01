# Database Setup Guide

JobHunter uses two separate PostgreSQL databases to keep test data separate from your personal data:

- **`jobhunter_dev`** - Development database with test data (safe to share/reset)
- **`jobhunter_personal`** - Your personal production database (private, never committed to Git)

## Initial Setup

### 1. Create the Development Database

First, rename your existing database (if you have one) or create a fresh dev database:

```bash
# If you already have a 'jobhunter' database, rename it to 'jobhunter_dev'
psql -U postgres -c "ALTER DATABASE jobhunter RENAME TO jobhunter_dev;"

# Or create a fresh dev database
psql -U postgres -c "CREATE DATABASE jobhunter_dev;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE jobhunter_dev TO jobhunter_user;"
```

### 2. Create the Personal Database

```bash
psql -U postgres -c "CREATE DATABASE jobhunter_personal;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE jobhunter_personal TO jobhunter_user;"
```

### 3. Initialize Personal Database (Schema Only)

```bash
psql -U jobhunter_user -d jobhunter_personal -f database/schema.sql
psql -U jobhunter_user -d jobhunter_personal -f database/migration_phase5.1.sql
```

### 4. Configure Your Environment

Copy the example environment file:
```bash
cp backend/.env.example backend/.env
```

Then switch to your personal database:
```bash
./switch-to-personal.sh
```

## Helper Scripts

### Switch Between Databases

**Switch to personal database (for real use):**
```bash
./switch-to-personal.sh
```

**Switch to development database (for testing):**
```bash
./switch-to-dev.sh
```

**Note:** You must restart the backend server after switching databases.

### Reset Development Database

If you want to reset the dev database to a clean state with fresh test data:

```bash
./reset-dev-db.sh
```

This will:
- Drop and recreate `jobhunter_dev`
- Load the schema
- Apply all migrations
- Load test seed data

### Backup Personal Database

Create a timestamped backup of your personal database:

```bash
./backup-personal-db.sh
```

Backups are saved to `database/backups/` (excluded from Git) and are automatically compressed with filenames like `jobhunter_personal_20251001_143022.sql.gz`.

### Restore Personal Database

Restore your personal database from a backup (⚠️ **WARNING**: This will delete all current data!):

```bash
# Interactive mode - select from available backups
./restore-personal-db.sh

# Direct mode - restore specific backup file
./restore-personal-db.sh database/backups/jobhunter_personal_20251001_143022.sql.gz
```

The script will list available backups (in interactive mode), warn about data loss, and restore the selected backup.

## Security Notes

✅ **Safe to commit to Git:**
- `backend/.env.example` - Example configuration
- Database schema files
- Test seed data files

❌ **Never committed to Git (in .gitignore):**
- `backend/.env` - Your actual database connection (contains DB name)
- `database/backups/` - Your personal database backups
- `backend/.env.backup` - Backup files created by switch scripts

## Workflow Recommendations

### For Development/Testing
1. Use `jobhunter_dev` database
2. Feel free to reset it anytime with `./reset-dev-db.sh`
3. Make schema changes and test them here first

### For Personal Use
1. Use `jobhunter_personal` database
2. Back it up regularly with `./backup-personal-db.sh`
3. This database contains your real resumes, applications, and job data

### Before Pushing to GitHub
1. Always use the dev database for testing features
2. Ensure `backend/.env` is in `.gitignore` (already configured)
3. Double-check no personal data is in committed SQL files

## Current Database Status

To check which database you're currently using:
```bash
grep DATABASE_URL backend/.env
```
