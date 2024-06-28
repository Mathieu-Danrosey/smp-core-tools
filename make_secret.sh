#!/bin/bash
set -e

#
SMP_ROOT_SECRETS_FOLDER="./run/secrets"
# Create the directory if it does not exist
mkdir -p $SMP_ROOT_SECRETS_FOLDER
# Write predefined values to each file
echo "docker181245-dev-postgis.sh1.hidora.net" > "${SMP_ROOT_SECRETS_FOLDER}/db_host" 
echo "5432" > "${SMP_ROOT_SECRETS_FOLDER}/db_port" 
echo "true" > "${SMP_ROOT_SECRETS_FOLDER}/db_freezed" 
echo "true" > "${SMP_ROOT_SECRETS_FOLDER}/db_timestamp" 
echo "public" > "${SMP_ROOT_SECRETS_FOLDER}/db_schema" 
echo "true" > "${SMP_ROOT_SECRETS_FOLDER}/db_sync" 
echo "true" > "${SMP_ROOT_SECRETS_FOLDER}/db_paranoid" 
echo "postgres" > "${SMP_ROOT_SECRETS_FOLDER}/mu_db_name" 
echo "postgres" > "${SMP_ROOT_SECRETS_FOLDER}/mu_db_username" 
echo "b@$icP@$$word" > "${SMP_ROOT_SECRETS_FOLDER}/mu_db_pswd" 
echo "postgres" > "${SMP_ROOT_SECRETS_FOLDER}/db_dialect" 
echo "console.log" > "${SMP_ROOT_SECRETS_FOLDER}/db_logging" 
echo "" > "${SMP_ROOT_SECRETS_FOLDER}/db_pool"
# Print a message indicating the operation is complete
echo "Secrets have been written to $SMP_ROOT_SECRETS_FOLDER"