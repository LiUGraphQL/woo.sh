#!/usr/bin/env bash

# generate GraphQL API schema
root=$(pwd)

cd ../../../graphql-api-generator
python3 generator.py \
    --input "${root}/starwars-db.graphql" \
    --config ../example/config.yml \
    --output "${root}/starwars-api.graphql"

cd ${root}

# generate resolvers.js
cd ../../../graphql-resolver-generator
python3 generator.py \
    --input "${root}/starwars-api.graphql" \
    --config ../example/config.yml \
    --output ${root}/

cd ${root}

mv resolvers.js starwars-resolvers.js