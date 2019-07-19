#!/usr/bin/env python3
import yaml
from graphql import build_schema

import generator
from utils.schema_printer import print_schema

config_file = './resources/config.yml'
input_files = './resources/schema.graphql'

config = ''
with open(config_file) as f:
    config = yaml.safe_load(f)

# input files
schema_string = ''
for file in input_files.split(','):
    with open(file, 'r') as f:
        schema_string += f.read() + '\n'

schema = generator.run(build_schema(schema_string), config)
print(print_schema(schema))
