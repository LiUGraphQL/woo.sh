#!/usr/bin/env python3
from graphql import GraphQLObjectType, GraphQLNonNull, GraphQLArgument, GraphQLScalarType, is_object_type, \
    introspection_types, GraphQLField


def add_query_by_id(schema):
    if 'Query' in schema.type_map:
        raise ValueError('Query type should only be defined by the system')

    query = GraphQLObjectType('Query', {})

    ID = GraphQLArgument(GraphQLNonNull(GraphQLScalarType('ID', lambda x: x)))
    for n, t in schema.type_map.items():
        if n not in introspection_types and is_object_type(t):
            field = GraphQLField(t, { 'ID': ID })
            query.fields[n[0].lower() + n[1:]] = field;

    schema.type_map['Query'] = query
    schema.query_type = query
    return schema


def insert(field_name, field, fields):
    new_fields = {field_name : field}
    for n, f in fields.items():
        new_fields[n] = f
    return new_fields