#!/usr/bin/env python3
from graphql import GraphQLObjectType, GraphQLNonNull, GraphQLArgument, GraphQLScalarType, is_object_type, \
    introspection_types, GraphQLField, GraphQLList


def add_query_by_id(schema):
    if 'Query' in schema.type_map:
        raise ValueError('Query type should only be defined by the system')

    query = GraphQLObjectType('Query', {})

    ID = GraphQLArgument(GraphQLNonNull(GraphQLScalarType('ID', lambda x: x)))
    for n, t in schema.type_map.items():
        if n not in introspection_types and is_object_type(t):
            field = GraphQLField(t, {'ID': ID})
            query.fields[n] = field;

    schema.type_map['Query'] = query
    return schema


def add_query_by_type(schema):
    # create list types
    ID = GraphQLField(GraphQLNonNull(GraphQLScalarType('ID', lambda x: x)))
    total_count = GraphQLField(GraphQLScalarType('Int', lambda x: x))
    is_end_of_whole_list = GraphQLField(GraphQLScalarType('Boolean', lambda x: x))
    types = {}
    for n, t in schema.type_map.items():
        if n not in introspection_types and is_object_type(t):
            if n is 'Query': continue
            content = GraphQLField(GraphQLList(GraphQLScalarType(n, lambda x: x)))
            name = 'ListOf{0}s'.format(n)
            type = GraphQLObjectType(name, {})
            type.fields['totalCount'] = total_count
            type.fields['isEndOfWholeList'] = is_end_of_whole_list
            type.fields['content'] = content
            types[name] = type

    # add list types
    for n, t in types.items():
        schema.type_map[n] = t

    # add queries for list types
    query = schema.type_map['Query']
    after = GraphQLArgument(GraphQLScalarType('ID', lambda x: x))
    first = GraphQLArgument(GraphQLScalarType('Int', lambda x: x))
    for n, t in types.items():
        field = GraphQLField(t, {'first': first, 'after': after})
        query.fields[n] = field

    return schema


def insert(field_name, field, fields):
    new_fields = {field_name : field}
    for n, f in fields.items():
        new_fields[n] = f
    return new_fields
