#!/usr/bin/env python3

from graphql import build_schema, introspection_types, is_object_type, GraphQLField, GraphQLScalarType, GraphQLNonNull


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


def insert(field_name, field, fields):
    new_fields = {field_name : field}
    for n, f in fields.items():
        new_fields[n] = f
    return new_fields
