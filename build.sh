#!/usr/bin/env bash

root=$(pwd)

## config
output=${root}/bin/woosh-server
db_schema=${root}/examples/schema/starwars.graphql
api_schema=${output}/resources/api-schema.graphql
api_config=${root}/graphql-server/api-schema-config.yml
driver=arangodb

# create directory structure
mkdir -p ${output}/resources

# copy server files
cp graphql-server/server.js ${output}/
cp graphql-server/drivers/${driver}/* ${output}/

# install dependencies
cd bin/woosh-server
npm install
cd ${root}
# Hack: Modify executeFieldsSerially(...) in /node_modules/graphql/execution/execute.js to gain more control over execution
cp ./graphql-server/graphql/execution/execution.js ${output}/node_modules/graphql/execution/execute.js

# generate API
cd ./graphql-api-generator
python3 generator.py \
    --input ${db_schema} \
    --output ${output}/resources/api-schema.graphql \
    --config ${api_config}
cd ${root}

# generate resolvers
cd ./graphql-resolver-generator
python3 generator.py \
    --input ${api_schema} \
    --output ${output}
cd ${root}

# copy custom GraphQL API extension and resolvers (hello world example by default)
cp ./graphql-server/api-schema-custom-extensions.graphql ${output}/resources/api-schema-custom-extensions.graphql
cp ./graphql-server/custom-resolvers.js ${output}/custom-resolvers.js


