#!/usr/bin/env bash

# generate GraphQL API schema
python3 generator.py \
    --input ./resources/schema.graphql \
    --config ./resources/config.yml \
    --output ./resources/api-schema.graphql
