#!/usr/bin/env bash

# generate GraphQL API schema
cd ../graphql-api-generator
python3 generator.py \
    --input ./resources/schema.graphql \
    --config ./resources/config.yml \
    --output ./resources/api-schema.graphql

# generate resolvers.js
cd ../graphql-resolver-generator
python3 generator.py \
    --input ../graphql-api-generator/resources/api-schema.graphql \
    --output ./resources/