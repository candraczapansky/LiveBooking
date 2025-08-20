#!/bin/bash

# Get database URL from environment or use default
DATABASE_URL="postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require"

# First, check current user info
psql "$DATABASE_URL" -c "SELECT id, username, first_name, last_name, role FROM users WHERE id = 1;"

# Update user role to admin
psql "$DATABASE_URL" -c "UPDATE users SET role = 'admin' WHERE id = 1 RETURNING id, username, first_name, last_name, role;"
