#!/usr/bin/env python3
import argparse

from graphql import print_schema

from utils import generator


def cmd(args):
    run(args.input, args.output, args.config)


def run(input_file, ouput_file, config_file):
    config = generator.load_config(config_file)
    schema = generator.read_schema_file(input_file)
    if config.getboolean('MAIN', 'schema.typeId'):
        schema = generator.add_id_to_type(schema)
    if config.getboolean('QUERY', 'schema.queryById'):
        schema = generator.add_query_by_id(schema)
    if config.getboolean('QUERY', 'schema.queryByType'):
        schema = generator.add_query_by_type(schema)
    if config.getboolean('MUTATION', 'schema.inputToCreateObjects'):
        schema = generator.add_input_to_create_objects(schema)
    if config.getboolean('MUTATION', 'schema.createObjects'):
        schema = generator.add_mutation_for_creating_objects(schema)
    if config.getboolean('MUTATION', 'schema.inputToUpdateObjects'):
        schema = generator.add_input_to_update_objects(schema)

    with open(ouput_file, 'w') as out:
        out.write(print_schema(schema))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=str,
                        help='Input schema file')
    parser.add_argument('--output', type=str,
                        help='Output schema file')
    parser.add_argument('--config', type=str, default='./resources/config.cfg',
                        help='Config file')
    args = parser.parse_args()
    cmd(args)