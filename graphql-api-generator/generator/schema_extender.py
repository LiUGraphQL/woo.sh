#!/usr/bin/env python3

import graphql
from graphql import build_schema, extend_schema, parse, print_schema
from graphql import GraphQLObjectType, GraphQLInputObjectType, GraphQLInputField, GraphQLSchema, GraphQLString
from graphql.type import is_input_type


def read_schema_file(filename):
    with open(filename, 'r', encoding='utf8') as s_file:
        schema = build_schema(''.join(s_file))
    return schema