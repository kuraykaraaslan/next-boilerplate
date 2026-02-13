-- Migration: Update UserRole enum values
-- From: GUEST, USER, ADMIN
-- To: SYSTEM_ADMIN, TENANT_ADMIN, TENANT_USER

-- Step 1: Add new enum values
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SYSTEM_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TENANT_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TENANT_USER';

-- Step 2: Update existing user records
-- Map old values to new values
UPDATE users 
SET "userRole" = CASE 
  WHEN "userRole" = 'ADMIN' THEN 'SYSTEM_ADMIN'
  WHEN "userRole" = 'USER' THEN 'TENANT_USER'
  WHEN "userRole" = 'GUEST' THEN 'TENANT_USER'
  ELSE "userRole"
END
WHERE "userRole" IN ('ADMIN', 'USER', 'GUEST');

-- Step 3: Note - Cannot remove old enum values in PostgreSQL without recreating the enum
-- Old values (GUEST, USER, ADMIN) will remain in the enum but unused
-- To fully clean up, you would need to:
-- 1. Create new enum type
-- 2. Alter column to use new enum
-- 3. Drop old enum
-- This is handled automatically by Prisma migrations when using migrate dev
