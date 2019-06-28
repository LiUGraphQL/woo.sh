#!/usr/bin/env python3
import argparse
import configparser
import re
from io import UnsupportedOperation

from graphql import build_schema, print_schema
from utils.utils import add_id_to_object_types, add_create_and_connect_input_types, add_reverse_edges, add_get_queries, \
    add_list_queries, add_create_mutations, add_update_input_types, add_scalar_filters, add_type_filters, \
    add_query_and_mutation_types, add_update_mutations, add_delete_mutations, add_enum_filters, decapitalize, \
    add_list_of_types, add_id_to_interface_types


def cmd(args):
    run(args.input, args.output, args.normalize)


def run(input_files, ouput_file, normalize, config_file):
    config = load_config(config_file)

    # concat input files
    files = input_files.split(',')
    schema_string = ''
    for file in files:
        with open(file, 'r') as f:
            schema_string += f.read() + '\n'

    if normalize:
        schema_string = re.sub('([A-Za-z_\-]+\s*:)', lambda pat: decapitalize(pat.group(1)), schema_string)

    # drop comments
    schema_string = re.sub('""".*?"""', '', schema_string, flags=re.DOTALL)

    schema = build_schema(schema_string)
    schema = add_query_and_mutation_types(schema)

    if config.getboolean('MAIN', 'schema.fieldForId'):
        schema = add_id_to_object_types(schema)
        # schema = add_id_to_interface_types(schema)
    if config.getboolean('MAIN', 'schema.reverseEdges'):
        schema = add_reverse_edges(schema)
    if config.getboolean('MAIN', 'schema.edgeTypes'):
        raise UnsupportedOperation('{0} is currently not supported'.format('edgeTypes'))
    if config.getboolean('MAIN', 'schema.fieldsForEdgeTypes'):
        raise UnsupportedOperation('{0} is currently not supported'.format('fieldsForEdgeTypes'))

    if config.getboolean('QUERY', 'schema.queryById'):
        schema = add_get_queries(schema)
    if config.getboolean('QUERY', 'schema.queryListOf'):
        schema = add_list_of_types(schema)
        schema = add_enum_filters(schema)
        schema = add_scalar_filters(schema)
        schema = add_type_filters(schema)
        schema = add_list_queries(schema)
    if config.getboolean('MUTATION', 'schema.inputToCreateObjects'):
        schema = add_create_and_connect_input_types(schema)
    if config.getboolean('MUTATION', 'schema.inputToUpdateObjects'):
        schema = add_update_input_types(schema)
    if config.getboolean('MUTATION', 'schema.createObjects'):
        schema = add_create_mutations(schema)
    if config.getboolean('MUTATION', 'schema.updateObjects'):
        schema = add_update_mutations(schema)
    if config.getboolean('MUTATION', 'schema.deleteObjects'):
        schema = add_delete_mutations(schema)
    if config.getboolean('MUTATION', 'schema.inputToCreateEdgeObjects'):
        raise UnsupportedOperation('{0} is currently not supported'.format('inputToCreateEdgeObjects'))
    if config.getboolean('MUTATION', 'schema.inputToUpdateEdgeObjects'):
        raise UnsupportedOperation('{0} is currently not supported'.format('inputToUpdateEdgeObjects'))
    if config.getboolean('MUTATION', 'schema.createEdgeObjects'):
        raise UnsupportedOperation('{0} is currently not supported'.format('createEdgeObjects'))
    if config.getboolean('MUTATION', 'schema.updateEdgeObjects'):
        raise UnsupportedOperation('{0} is currently not supported'.format('updateEdgeObjects'))
    if config.getboolean('MUTATION', 'schema.deleteEdgeObjects'):
        raise UnsupportedOperation('{0} is currently not supported'.format('deleteEdgeObjects'))

    if ouput_file:
        with open(ouput_file, 'w') as out:
            out.write(print_schema(schema))
    else:
        print(print_schema(schema))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=str, required=True,
                        help='Input schema files (separated by commas)')
    parser.add_argument('--output', type=str,
                        help='Output schema file (default stdout)')
    parser.add_argument('--normalize', type=bool,
                        help='Normalize naming of types and fields (default false)')
    parser.add_argument('--config', type=str, required=True,
                        help='Path to configuration file')
    args = parser.parse_args()
    cmd(args)


def load_config(config_file):
    config = configparser.ConfigParser()
    config.read_file(open(config_file))
    return config


def print_config(config):
    for section in config.sections():
        print('Section: {0}'.format(section));
        for arg in config[section]:
            print('   {0} = {1}'.format(arg, config[section][arg]))