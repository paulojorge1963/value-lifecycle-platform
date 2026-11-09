-- Force a password change after an admin creates or resets an account.
-- The initial/reset password is temporary; the user sets their own on first
-- sign-in, which clears this flag. Self-registered admins default to false.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
