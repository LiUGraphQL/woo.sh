#!/usr/bin/env python3
import argparse
import os
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
    config = {}
    if args.config:
        with open(args.config) as f:
            config = yaml.safe_load(f)

    # get list of schema files
    files = []
    if os.path.isdir(args.input):
        for filename in os.listdir(args.input):
            if filename.endswith(".graphql"):
                files.append(f'{args.input}/{filename}')
    else:
        files = args.input.split(',')

    # build schema
    schema_string = ''
    for file in files:
        with open(file, 'r') as f:
            schema_string += f.read() + '\n'
    schema = build_schema(schema_string)
    
    # run
    schema = run(schema, config)

    # write to file or stdout
    if args.output:
        with open(args.output, 'w') as out:
            out.write(printSchemaWithDirectives(schema))
    else:
        print(printSchemaWithDirectives(schema))


def run(schema: GraphQLSchema, config: dict):
    # validate
    if config.get('validate'):
        validate_names(schema, config.get('validate'))

    # transform
    if config.get('transform'):
        transform_names(schema, config.get('transform'))

    # API generation
    if config.get('generation'):
        if config.get('generation').get('add_query_type'):
            schema = add_query_type(schema)
        if config.get('generation').get('add_mutation_type'):
            schema = add_mutation_type(schema)

        # add id
        if config.get('generation').get('field_for_id'):
            schema = add_id_to_types(schema)

        # check if DateTime exists, or should be added
        if config.get('generation').get('generate_datetime'):
            datetime_control(schema)

        # add reverse edges for traversal
        if config.get('generation').get('reverse_edges'):
            schema = add_reverse_edges(schema)

        # add edge types
        if config.get('generation').get('edge_types') or config.get('generation').get('create_edge_objects'):
            schema = add_edge_objects(schema)
        if config.get('generation').get('fields_for_edge_types'):
            raise UnsupportedOperation('{0} is currently not supported'.format('fields_for_edge_types'))

        # add creation date
        if config.get('generation').get('field_for_creation_date'):
            schema = add_creation_date_to_types(schema)

        # add last update date
        if config.get('generation').get('field_for_last_update_date'):
            schema = add_last_update_date_to_types(schema)

        # add queries
        if config.get('generation').get('query_by_id'):
            schema = add_get_queries(schema)
        if config.get('generation').get('query_type_filter') or config.get('generation').get('query_list_of'):
            schema = add_enum_filters(schema)
            schema = add_scalar_filters(schema, config)
            schema = add_type_filters(schema)

        if config.get('generation').get('query_type_filter'):
            schema = add_object_type_filters(schema)

        if config.get('generation').get('query_list_of'):
            schema = add_list_of_types(schema)
            schema = add_list_queries(schema)

        if config.get('generation').get('query_by_key'):
            schema = add_key_input_types(schema)
            schema = add_key_queries(schema)

        # add input types
        if config.get('generation').get('input_to_create_objects'):
            schema = add_input_to_create(schema)
        if config.get('generation').get('input_to_update_objects'):
            schema = add_input_update(schema)

        # add edge input types
        if config.get('generation').get('input_to_create_edge_objects'):
            schema = add_input_to_create_edge_objects(schema)
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
            schema = add_mutation_create_edge_objects(schema)
        if config.get('generation').get('update_edge_objects'):
            raise UnsupportedOperation('{0} is currently not supported'.format('update_edge_objects'))
        if config.get('generation').get('delete_edge_objects'):
            raise UnsupportedOperation('{0} is currently not supported'.format('delete_edge_objects'))

        # remove field arguments for edges (should not be in the API schema)
        schema = remove_field_arguments_for_types(schema)

    return schema


def validate_names(schema: GraphQLSchema, validate):

    # types and interfaces
    if validate.get('type_names'):
        # type names
        f = string_transforms.get(validate.get('type_names'))
        if f is None:
            raise Exception('Unrecognized option: ' + validate.get('type_names'))
        for type_name, _type in schema.type_map.items():
            if is_introspection_type(_type):
                continue
            if f(type_name) != type_name:
                print(f'Warning: Type "{type_name}" does not follow {validate.get("type_names")}')

    # field names
    if validate.get('field_names'):
        f = string_transforms.get(validate.get('field_names'))
        if f is None:
            raise Exception('Unrecognized option: ' + validate.get('field_names'))
        for type_name, _type in schema.type_map.items():
            if is_introspection_type(_type) or is_enum_or_scalar(_type):
                continue
            for field_name in _type.fields.keys():
                if field_name.startswith('_'):
                    continue
                if f(field_name) != field_name:
                    print(f'Warning: Field "{field_name}" does not follow {validate.get("field_names")}')

    # enum names
    if validate.get('enum_values'):
        f = string_transforms.get(validate.get('enum_values'))
        if f is None:
            raise Exception('Unrecognized option: ' + validate.get('enum_values'))
        for type_name, _type in schema.type_map.items():
            if is_introspection_type(_type) or not is_enum_type(_type):
                continue

            for i in _type.values.keys():
                if f(i) != i:
                    print(f'Warning: Enum "{i}" does not follow {validate.get("enum_values")}')


def transform_names(schema: GraphQLSchema, transform):

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


def transform_types(schema, transform):
    type_names = list(schema.type_map.keys())
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
        field_names = list(_type.fields.keys())
        for field_name in field_names:
            if field_name.startswith('_'):
                continue
            field = _type.fields[field_name]
            _type.fields.pop(field_name)
            _type.fields[transform(field_name)] = field


def transform_enums(schema, transform):
    for _type in schema.type_map.values():
        if _type.name.startswith('_') or not is_enum_type(_type):
            continue

        enum_values_names = list(_type.values.keys())
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


def datetime_control(schema):
    type_names = list(schema.type_map.keys())
    if 'DateTime' in type_names:
        if not is_scalar_type(schema.type_map['DateTime']):
            raise Exception('DateTime exists but is not scalar type: ' + schema.type_map['DateTime'])
    else:
        schema.type_map['DateTime'] = GraphQLScalarType('DateTime')
        if not is_scalar_type(schema.type_map['DateTime']):
            raise Exception('DateTime could not be added as scalar!')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=str, required=True,
                        help='GraphQL DB schema files (separated by commas), or a path to a schema directory')
    parser.add_argument('--output', type=str,
                        help='Output schema file (default stdout)')
    parser.add_argument('--config', type=str,
                        help='Path to configuration file')

    cmd(parser.parse_args())


