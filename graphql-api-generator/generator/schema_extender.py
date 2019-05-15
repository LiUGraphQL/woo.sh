#!/usr/bin/env python3

import graphql
from graphql import build_schema, extend_schema, parse, print_schema, \
    GraphQLObjectType, GraphQLInputObjectType, GraphQLInputField, GraphQLSchema, GraphQLString, introspection_types, \
    is_object_type, GraphQLField, GraphQLScalarType, GraphQLNonNull

from graphql.type import is_input_type


def read_schema_file(filename):
    with open(filename, 'r', encoding='utf8') as s_file:
        schema = build_schema(''.join(s_file))
    return schema

def add_id_to_type(schema):
    ID = GraphQLField(GraphQLNonNull(GraphQLScalarType("ID", lambda x: x)))
    for n, t in schema.type_map.items():
        if n not in introspection_types and is_object_type(t):
            t.fields["id"] = ID

    return schema

