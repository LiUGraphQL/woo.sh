#!/usr/bin/env python3

import graphql
from graphql import build_schema, extend_schema, parse, print_schema, \
    GraphQLObjectType, GraphQLInputObjectType, GraphQLInputField, GraphQLSchema, GraphQLString, introspection_types, \
    is_object_type, GraphQLField

from graphql.type import is_input_type


def read_schema_file(filename):
    with open(filename, 'r', encoding='utf8') as s_file:
        schema = build_schema(''.join(s_file))
    return schema


def add_id_to_type(schema):
    for (n, t) in get_object_types(schema):
        pass
        #f = GraphQLField(ftype)
        #t.fields = GraphQLObjectType(name=n, fields=f)
        #in_obj = GraphQLObjectType(name=t, fields=i_fields)

    return schema


def get_object_types(schema):
    return [(n, t) for n, t in schema.type_map.items() if n not in introspection_types and is_object_type(t)]
