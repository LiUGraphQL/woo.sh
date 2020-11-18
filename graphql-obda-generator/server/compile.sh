#!/usr/bin/env bash
root=$(pwd)

# generate API schema
cd ../../graphql-api-generator
python3 generator.py \
    --input ../../graphql-schema/ \
    --config ../example/config.yml \
    --output "${root}/api-schema.graphql"
cd ${root}

# generate API resolvers
cd ../../graphql-resolver-generator
python3 generator.py \
    --input "${root}/api-schema.graphql" \
    --config ../example/config.yml \
    --output "${root}/"
cd ${root}