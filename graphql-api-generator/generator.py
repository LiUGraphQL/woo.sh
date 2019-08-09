#!/usr/bin/env python3
import argparse
from io import UnsupportedOperation

import yaml
from utils.utils import *

string_transforms = {
    'uppercase': uppercase,
    'lowercase': lowercase,
    'camelCase': camel_case,
    'PascalCase': pascal_case
}


def cmd(args):
    # load config
    if args.config:
        with open(args.config) as f:
            config = yaml.safe_load(f)
    else:
        config = {}

    # concat input files
    schema_string = ''
    for file in args.input.split(','):
        with open(file, 'r') as f:
            schema_string += f.read() + '\n'

    schema = run(build_schema(schema_string), config)

    # write to file or stdout
    if args.output:
        with open(args.output, 'w') as out:
            out.write(print_schema(schema))
    else:
        print(print_schema(schema))


def run(schema: GraphQLSchema, config: dict):
    # transform
    if config.get('transform'):
        transform = config.get('transform')
        # types and interfaces
        if transform.get('type_names'):
            if transform.get('type_names') in string_transforms:
                transform_types(schema, string_transforms[transform.get('type_names')])
            else:
                raise Exception('Unsupported type name transform: ' + transform.get('type_names'))

        # fields
        if transform.get('field_names'):
            if transform.get('field_names') in string_transforms:
                transform_fields(schema, string_transforms[transform.get('field_names')])
            else:
                raise Exception('Unsupported field name transform: ' + transform.get('field_names'))

        # enums
        if transform.get('enum_values'):
            if transform.get('enum_values') in string_transforms:
                transform_enums(schema, string_transforms[transform.get('enum_values')])
            else:
                raise Exception('Unsupported field name transform: ' + transform.get('field_names'))

        # comments
        if transform.get('drop_comments'):
            drop_comments(schema)

    # API generation
    if config.get('generation'):
        if config.get('generation').get('add_query_type'):
            schema = add_query_type(schema)
        if config.get('generation').get('add_mutation_type'):
            schema = add_mutation_type(schema)

        # add id
        if config.get('generation').get('field_for_id'):
            schema = add_id_to_types(schema)

        # add reverse edges for traversal
        if config.get('generation').get('reverse_edges'):
            schema = add_reverse_edges(schema)

        # add edge types
        if config.get('generation').get('edge_types'):
            raise UnsupportedOperation('{0} is currently not supported'.format('edgeTypes'))
        if config.get('generation').get('fields_for_edge_types'):
            raise UnsupportedOperation('{0} is currently not supported'.format('fields_for_edge_types'))

        # add queries
        if config.get('generation').get('query_by_id'):
            schema = add_get_queries(schema)
        if config.get('generation').get('query_type_filter') or config.get('generation').get('query_list_of'):
            schema = add_enum_filters(schema)
            schema = add_scalar_filters(schema)
            schema = add_type_filters(schema)

        # remove field arguments for edges (should not be in the API schema)
        schema = remove_field_arguments_for_types(schema)

        if config.get('generation').get('query_type_filter'):
            schema = add_object_type_filters(schema)

        if config.get('generation').get('query_list_of'):
            schema = add_list_of_types(schema)
            schema = add_list_queries(schema)
            #schema = add_filters_to_type_fields(schema)

        # add input types
        if config.get('generation').get('input_to_create_objects'):
            schema = add_input_to_create(schema)
        if config.get('generation').get('input_to_update_objects'):
            schema = add_input_update(schema)

        # add edge input types
        if config.get('generation').get('input_to_create_edge_objects'):
            raise UnsupportedOperation('{0} is currently not supported'.format('input_to_create_edge_objects'))
        if config.get('generation').get('input_to_update_edge_objects'):
            raise UnsupportedOperation('{0} is currently not supported'.format('input_to_update_edge_objects'))

        # add mutations
        if config.get('generation').get('create_objects'):
            schema = add_create_mutations(schema)
        if config.get('generation').get('update_objects'):
            schema = add_update_mutations(schema)
        if config.get('generation').get('delete_objects'):
            schema = add_delete_mutations(schema)

        # add edge mutations
        if config.get('generation').get('create_edge_objects'):
            raise UnsupportedOperation('{0} is currently not supported'.format('create_edge_objects'))
        if config.get('generation').get('update_edge_objects'):
            raise UnsupportedOperation('{0} is currently not supported'.format('update_edge_objects'))
        if config.get('generation').get('delete_edge_objects'):
            raise UnsupportedOperation('{0} is currently not supported'.format('delete_edge_objects'))

    return schema


def transform_types(schema, transform):
    type_names = set(schema.type_map.keys())
    for type_name in type_names:
        _type = schema.type_map[type_name]
        if type_name.startswith('_') or is_scalar_type(_type):
            continue
        schema.type_map.pop(type_name)
        _type.name = transform(type_name)
        schema.type_map[_type.name] = _type


def transform_fields(schema, transform):
    for _type in schema.type_map.values():
        if _type.name.startswith('_') or is_scalar_type(_type) or is_enum_type(_type):
            continue
        field_names = set(_type.fields.keys())
        for field_name in field_names:
            field = _type.fields[field_name]
            _type.fields.pop(field_name)
            _type.fields[transform(field_name)] = field


def transform_enums(schema, transform):
    for _type in schema.type_map.values():
        if _type.name.startswith('_') or not is_enum_type(_type):
            continue

        enum_values_names = set(_type.values.keys())
        for i in enum_values_names:
            enum_value = _type.values[i]
            _type.values.pop(i)
            _type.values[transform(i)] = enum_value


def drop_comments(schema):
    for _type in schema.type_map.values():
        _type.description = None
        if _type.name.startswith('_') or is_scalar_type(_type):
            continue
        elif is_enum_type(_type):
            for e in _type.values.values():
                e.description = None
        else:
            for field in _type.fields.values():
                field.description = None


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=str, required=True,
                        help='Input schema files (separated by commas)')
    parser.add_argument('--output', type=str,
                        help='Output schema file (default stdout)')
    parser.add_argument('--config', type=str,
                        help='Path to configuration file')
    cmd(parser.parse_args())


