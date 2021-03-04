#!/usr/bin/env bash
root=$(pwd)

# generate Star Wars API schema
cd ../../../graphql-api-generator
python3 generator.py \
    --input "${root}/starwars-db.graphql" \
    --config ../example/config.yml \
    --output "${root}/starwars-api.graphql"
cd ${root}

# generate Star Wars API resolvers
cd ../../../graphql-resolver-generator
python3 generator.py \
    --input "${root}/starwars-api.graphql" \
    --config ../example/config.yml \
    --output ${root}/
cd ${root}

mv resolvers.js starwars-resolvers.js

# generate directives tests API schema
cd ../../../graphql-api-generator
python3 generator.py \
    --input "${root}/directives-tests-schema.graphql" \
    --config ../example/config.yml \
    --output "${root}/directives-tests-api.graphql"
cd ${root}

# generate directives tests API resolvers
cd ../../../graphql-resolver-generator
python3 generator.py \
    --input "${root}/directives-tests-api.graphql" \
    --config ../example/config.yml \
    --output ${root}/
cd ${root}

mv resolvers.js directives-tests-resolvers.js

# generate directives interface tests API schema
cd ../../../graphql-api-generator
python3 generator.py \
    --input "${root}/directives-interface-tests-schema.graphql" \
    --config ../example/config.yml \
    --output "${root}/directives-interface-tests-api.graphql"
cd ${root}

# generate directives interface tests API resolvers
cd ../../../graphql-resolver-generator
python3 generator.py \
    --input "${root}/directives-interface-tests-api.graphql" \
    --config ../example/config.yml \
    --output ${root}/
cd ${root}

mv resolvers.js directives-interface-tests-resolvers.js