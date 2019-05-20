#!/usr/bin/env python3

from graphql import build_schema, introspection_types, is_object_type, GraphQLField, GraphQLScalarType, GraphQLNonNull,\
    GraphQLInputField, GraphQLInputObjectType


def read_schema_file(filename):
    with open(filename, 'r', encoding='utf8') as s_file:
        schema = build_schema(''.join(s_file))
    return schema


def add_id_to_type(schema):
    ID = GraphQLField(GraphQLNonNull(GraphQLScalarType('ID', lambda x: x)))

    for n, t in schema.type_map.items():
        if n not in introspection_types and is_object_type(t):
            if 'ID' in t.fields or 'Id' in t.fields or 'id' in t.fields:
                raise ValueError('IDs for types should only be defined by the system')
            t.fields = insert('ID', ID, t.fields)

    return schema


def add_input_to_create_objects(schema):
    input_prefix = 'DataToCreate'
    input_objects = {}
    for n, t in schema.type_map.items():
        if n not in introspection_types and is_object_type(t):
            if n is 'Query' or n is 'Mutation':
                continue

            # Skip 'ListOf'
            if n.startswith('ListOf'):
                continue

            input_fields = {}
            for field_name, field in t.fields.items():
                input_fields[field_name] = GraphQLInputField(field.type)

            name = input_prefix + n
            input_objects[name] = GraphQLInputObjectType(name, input_fields)

    for n, t in input_objects.items():
        schema.type_map[n] = t

    return schema


def insert(field_name, field, fields):
    new_fields = {field_name : field}
    for n, f in fields.items():
        new_fields[n] = f
    return new_fields
