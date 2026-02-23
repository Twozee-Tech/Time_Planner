-- DataMigration: upgrade existing ADMIN users to SUPER_ADMIN
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';