#!/bin/bash

# Configurable parameters
CONTAINER_NAME="postgres_database_proceed" 
POSTGRES_USER="proceed"                        
POSTGRES_PASSWORD="proceed"
POSTGRES_DB="proceed_db"                    
CONFIG_FILE="./db-config.json"           
ENV_FILE="./.env"                        
DB_HOST="localhost"
DB_PORT="5432"
DEFAULT_SCHEMA="public"                 

# Get the current branch name
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

# Replace hyphens with underscores in the branch name
BRANCH_NAME_SAFE=$(echo "$BRANCH_NAME" | tr '-' '_')

# Database name specific to the current branch
DB_NAME="proceed_db_${BRANCH_NAME_SAFE}"

# Check if the Docker container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "Starting Docker container: $CONTAINER_NAME"
  docker start "$CONTAINER_NAME"
  if [ $? -ne 0 ]; then
    echo "Failed to start Docker container: $CONTAINER_NAME"
    exit 1
  fi
fi

# Check if the database already exists
echo "Checking if the database $DB_NAME exists..."
DB_EXISTS=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")

if [ "$DB_EXISTS" == "1" ]; then
  echo "Database $DB_NAME already exists. Skipping creation."
else
  # Create a new database for the branch if it doesn't exist
  echo "Creating a new database for branch: $BRANCH_NAME_SAFE"
  docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE $DB_NAME;"

  if [ $? -ne 0 ]; then
    echo "Failed to create database: $DB_NAME"
    exit 1
  fi
  echo "Database $DB_NAME created."
fi

# Generate the new DATABASE_URL in the required format
DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=$DEFAULT_SCHEMA"

# Replace DATABASE_URL in the .env file
if [ -f "$ENV_FILE" ]; then
  echo "Updating DATABASE_URL in $ENV_FILE"
  
 # Check if the DATABASE_URL already exists in the file
  if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
    # If DATABASE_URL exists, update it
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" "$ENV_FILE"
  else
    # If DATABASE_URL does not exist, append it to the file
    echo "DATABASE_URL=$DATABASE_URL" >> "$ENV_FILE"
  fi
  
  if [ $? -eq 0 ]; then
    echo "DATABASE_URL successfully updated in $ENV_FILE"
  else
    echo "Failed to update DATABASE_URL in $ENV_FILE"
    exit 1
  fi
else
  echo "$ENV_FILE not found! Skipping .env update."
fi

# apply the schema to new db
yarn prisma migrate deploy
