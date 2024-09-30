#!/bin/bash

# Configurable parameters
CONTAINER_NAME="postgres_database_proceed"  # Replace with your Docker container name
POSTGRES_USER="proceed"                     # PostgreSQL user
POSTGRES_PASSWORD="proceed"                 # PostgreSQL password
DEFAULT_DB="proceed_db"                     # The default database name when --default is used
ENV_FILE="./.env"                           
DB_HOST="localhost"
DB_PORT="5432"
DEFAULT_SCHEMA="public"

# Parse command-line arguments
USE_DEFAULT_DB=false
CREATE_NEW_DB=false
DELETE_DB=false

for arg in "$@"; do
  case $arg in
    --default)
      USE_DEFAULT_DB=true
      ;;
    --new)
      CREATE_NEW_DB=true
      ;;
    --delete)
      DELETE_DB=true
      ;;
    *)
      echo "Unknown option: $arg"
      exit 1
      ;;
  esac
done

# Get the current branch name
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

# Replace hyphens with underscores in the branch name
BRANCH_NAME_SAFE=$(echo "$BRANCH_NAME" | tr '-' '_')

# Determine which database to use
if [ "$USE_DEFAULT_DB" = true ]; then
  DB_NAME=$DEFAULT_DB
  echo "Using default database: $DB_NAME"
else
  DB_NAME="proceed_db_${BRANCH_NAME_SAFE}"
  echo "Using branch-specific database: $DB_NAME"
fi

# Check if the Docker container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "Starting Docker container: $CONTAINER_NAME"
  docker start "$CONTAINER_NAME"
  if [ $? -ne 0 ]; then
    echo "Failed to start Docker container: $CONTAINER_NAME"
    exit 1
  fi
fi

# Handle --delete option: Delete the branch-specific database
if [ "$DELETE_DB" = true ]; then
  if [ "$USE_DEFAULT_DB" = false ]; then
    echo "Checking if the database $DB_NAME exists for deletion..."
    DB_EXISTS=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$DEFAULT_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")
    
    if [ "$DB_EXISTS" == "1" ]; then
      echo "Dropping the database: $DB_NAME"
      docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$DEFAULT_DB" -c "DROP DATABASE $DB_NAME;"
      if [ $? -eq 0 ]; then
        echo "Database $DB_NAME dropped successfully."
      else
        echo "Failed to drop the database: $DB_NAME."
        exit 1
      fi
    else
      echo "Database $DB_NAME does not exist. Nothing to delete."
    fi
  else
    echo "Cannot delete the default database."
    exit 1
  fi
  exit 0
fi

# Handle --new option: Create a new database if it doesn't exist
if [ "$CREATE_NEW_DB" = true ]; then
  if [ "$USE_DEFAULT_DB" = false ]; then
    echo "Checking if the database $DB_NAME exists..."
    DB_EXISTS=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$DEFAULT_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")
    
    if [ "$DB_EXISTS" == "1" ]; then
      echo "Database $DB_NAME already exists. Reusing it."
    else
      # Create a new database for the branch if it doesn't exist
      echo "Creating a new database for branch: $BRANCH_NAME_SAFE"
      docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$DEFAULT_DB" -c "CREATE DATABASE $DB_NAME;"
      
      if [ $? -ne 0 ]; then
        echo "Failed to create database: $DB_NAME"
        exit 1
      fi
      echo "Database $DB_NAME created."
    fi
  else
    echo "Using the default database. Skipping branch-specific database creation."
  fi
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

# Apply the schema to the selected database (only on --new)
if [ "$CREATE_NEW_DB" = true ]; then
  echo "Applying the schema using Prisma..."
  yarn prisma migrate deploy

  if [ $? -eq 0 ]; then
    echo "Schema applied successfully to $DB_NAME."
  else
    echo "Failed to apply the schema to $DB_NAME."
    exit 1
  fi
fi
