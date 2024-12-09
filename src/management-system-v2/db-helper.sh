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
INIT=false
CREATE_NEW_DB=false
DELETE_DB=false
DELETE_ALL=false
DELETE_BRANCH=""
CHANGE_DB=false
CHANGE_OPTION=""

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --init)
      INIT=true
      ;;
    --new)
      CREATE_NEW_DB=true
      ;;
    --delete)
      DELETE_DB=true
      ;;
    --branch)
      DELETE_BRANCH="$2"
      shift  # Shift past the branch name argument
      ;;
    --all)
      DELETE_ALL=true
      ;;
    --use)
      CHANGE_DB=true
      ;;
    branch|default)
      CHANGE_OPTION="$1"
      ;;
    --*)  # Handle any unknown options
      echo "Unknown option: $1"
      exit 1
      ;;
    *)  # Handle non-option arguments (like branch names)
      BRANCH_NAME="$1"
      ;;
  esac
  shift  # Shift to the next argument
done

# Function to update the DATABASE_URL in .env file
update_env_file() {
  local db_name=$1
  local env_file=$2
  
  # Generate the new DATABASE_URL in the required format
  DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$DB_HOST:$DB_PORT/$db_name?schema=$DEFAULT_SCHEMA"

  # Replace DATABASE_URL in the .env file
  if [ -f "$env_file" ]; then
    echo "Updating DATABASE_URL in $env_file"

    # Check if the DATABASE_URL already exists in the file
    if grep -q "^DATABASE_URL=" "$env_file"; then
      # If DATABASE_URL exists, update it
      sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" "$env_file"
    else
      # If DATABASE_URL does not exist, append it to the file
      echo "DATABASE_URL=$DATABASE_URL" >> "$env_file"
    fi

    if [ $? -eq 0 ]; then
      echo "DATABASE_URL successfully updated in $env_file"
    else
      echo "Failed to update DATABASE_URL in $env_file"
      exit 1
    fi
  else
    echo "$env_file not found! Creating new .env file..."
    echo "DATABASE_URL=$DATABASE_URL" > "$env_file"
    if [ $? -eq 0 ]; then
      echo "Created new $env_file with DATABASE_URL"
    else
      echo "Failed to create $env_file"
      exit 1
    fi
  fi
}

# Get the current branch name (only if not provided)
if [ -z "$BRANCH_NAME" ]; then
  BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
fi

# Replace hyphens & slash with underscores in the branch name
BRANCH_NAME_SAFE=$(echo "$BRANCH_NAME" | tr '-' '_' | tr '/' '_')

# Determine which database to use
if [ "$DELETE_DB" == false ]; then
  if [ "$INIT" == true ]; then
    # Check if branch-specific database exists
    BRANCH_DB_NAME="proceed_db_${BRANCH_NAME_SAFE}"
    BRANCH_DB_EXISTS=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$DEFAULT_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='$BRANCH_DB_NAME';")
    
    # Check if default database exists
    DEFAULT_DB_EXISTS=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "postgres" -tAc "SELECT 1 FROM pg_database WHERE datname='$DEFAULT_DB';")
    
    if [ "$BRANCH_DB_EXISTS" == "1" ]; then
      DB_NAME=$BRANCH_DB_NAME
      echo "Using existing branch-specific database: $DB_NAME"
    elif [ "$DEFAULT_DB_EXISTS" == "1" ]; then
      DB_NAME=$DEFAULT_DB
      echo "Branch database not found. Using default database: $DB_NAME"
    else
      DB_NAME=$DEFAULT_DB
      echo "Neither branch nor default database exists. Creating default database: $DB_NAME"
      docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "postgres" -c "CREATE DATABASE $DB_NAME;"
      if [ $? -ne 0 ]; then
        echo "Failed to create default database: $DB_NAME"
        exit 1
      fi
      echo "Default database $DB_NAME created successfully."
    fi
    # Update .env file for init
    update_env_file "$DB_NAME" "$ENV_FILE"
  else
    DB_NAME="proceed_db_${BRANCH_NAME_SAFE}"
    echo "Using branch-specific database: $DB_NAME"
  fi
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

# Handle --delete option: Delete the specified database or all branch-specific databases
if [ "$DELETE_DB" == true ]; then
  if [ "$DELETE_ALL" == true ]; then
    echo "Deleting all branch-specific databases except the default one..."
    
    # Get a list of all databases and delete the ones that match the branch pattern
    DATABASES=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$DEFAULT_DB" -tAc "SELECT datname FROM pg_database WHERE datname LIKE 'proceed_db_%';")
    
    for DB in $DATABASES; do
      if [ "$DB" != "$DEFAULT_DB" ]; then
        echo "Dropping database: $DB"
        docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$DEFAULT_DB" -c "DROP DATABASE $DB;"
        if [ $? -eq 0 ]; then
          echo "Database $DB dropped successfully."
        else
          echo "Failed to drop the database: $DB."
        fi
      fi
    done
    exit 0
  elif [ -n "$DELETE_BRANCH" ]; then
    # Handle --delete --branch <branch-name>
    BRANCH_NAME_SAFE=$(echo "$DELETE_BRANCH" | tr '-' '_' | tr '/' '_')
    DB_NAME="proceed_db_${BRANCH_NAME_SAFE}"

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
    exit 0
  else
    # Handle default deletion
    if [ "$INIT" == false ]; then
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
  fi
  exit 0
fi

# Handle --new option: Create a new database if it doesn't exist
if [ "$CREATE_NEW_DB" == true ]; then
  if [ "$INIT" == false ]; then
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
    # Update .env file for new database
    update_env_file "$DB_NAME" "$ENV_FILE"
  else
    echo "Using the default database. Skipping branch-specific database creation."
  fi
fi

# Handle --use option: Update the DATABASE_URL in the .env file with the default or branch database
if [ "$CHANGE_DB" == true ]; then
  if [ "$CHANGE_OPTION" == "default" ]; then
    DB_NAME=$DEFAULT_DB
    echo "Switching to default database: $DB_NAME"
  elif [ "$CHANGE_OPTION" = "branch" ]; then
    DB_NAME="proceed_db_${BRANCH_NAME_SAFE}"
    echo "Switching to branch-specific database: $DB_NAME"
  else
    echo "Unknown option for --use: $CHANGE_OPTION. Use 'default' or 'branch'."
    exit 1
  fi

  # Update .env file for database change
  update_env_file "$DB_NAME" "$ENV_FILE"
fi

# Apply the schema to the selected database (only on --new and --init)
if [ "$CREATE_NEW_DB" == true ] || [ "$INIT" == true ]; then
  echo "Applying the schema using Prisma..."
  yarn prisma migrate deploy

  if [ $? -eq 0 ]; then
    echo "Schema applied successfully to $DB_NAME."
  else
    echo "Failed to apply the schema to $DB_NAME."
    exit 1
  fi
fi
