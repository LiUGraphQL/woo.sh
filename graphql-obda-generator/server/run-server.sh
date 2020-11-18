#!/usr/bin/env bash
root=$(pwd)
cd ..
#python3 generator.py
cd ${root}

export API_SCHEMA=${root}/api-schema.graphql
export RESOLVERS=${root}/resolvers.js
export CUSTOM_API_SCHEMA=${root}/../output/obda-schema.graphql
export CUSTOM_RESOLVERS=${root}/../output/obda-resolvers.js

node ../../graphql-server/app.js
