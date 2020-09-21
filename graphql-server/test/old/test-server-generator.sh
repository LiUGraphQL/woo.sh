#!/usr/bin/env bash
rm -rf ./test-server
sh ../../woo.sh --input ../../example/db-schema/ \
            --output ./test-server \
            --config ../../example/config.yml \
            --driver arangodb

cd ./test-server
echo 'DROP=true
DB_NAME=test-db' > .env
node server.js