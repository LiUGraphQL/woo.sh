#!/usr/bin/env python3
from graphql import GraphQLObjectType, GraphQLNonNull, GraphQLArgument, GraphQLScalarType, is_object_type, \
    introspection_types, GraphQLField, GraphQLList, GraphQLInputObjectType


def add_query_by_id(schema):
    if 'Query' in schema.type_map:
        raise ValueError('Query type should only be defined by the system')

    query = GraphQLObjectType('Query', {})

    ID = GraphQLArgument(GraphQLNonNull(GraphQLScalarType('ID', lambda x: x)))
    for n, t in schema.type_map.items():
        if n not in introspection_types and is_object_type(t):
            field = GraphQLField(t, {'id': ID})
            query.fields[lower(n)] = field;

    schema.type_map['Query'] = query
    schema.query_type = query
    return schema


def add_query_by_type(schema):
    if 'Query' not in schema.type_map:
        schema.type_map['Query'] = GraphQLObjectType('Query', {})
    query = schema.type_map['Query']

    # create list types
    total_count = GraphQLField(GraphQLScalarType('Int', lambda x: x))
    is_end_of_whole_list = GraphQLField(GraphQLScalarType('Boolean', lambda x: x))
    types = {}
    for n, t in schema.type_map.items():
        if n not in introspection_types and is_object_type(t):
            if n is 'Query' or n is 'Mutation':
                continue
            content = GraphQLField(GraphQLList(GraphQLScalarType(n, lambda x: x)))
            name = 'ListOf{0}s'.format(upper(n))
            type = GraphQLObjectType(name, {})
            type.fields['totalCount'] = total_count
            type.fields['isEndOfWholeList'] = is_end_of_whole_list
            type.fields['content'] = content
            types[name] = type

    # add list types
    for n, t in types.items():
        schema.type_map[n] = t

    # add queries for list types
    after = GraphQLArgument(GraphQLScalarType('ID', lambda x: x))
    first = GraphQLArgument(GraphQLScalarType('Int', lambda x: x))
    for n, t in types.items():
        field = GraphQLField(t, {'first': first, 'after': after})
        query.fields[lower(n)] = field

    return schema


def add_mutation_for_creating_objects(schema):
    if 'Mutation' not in schema.type_map:
        schema.type_map['Mutation'] = GraphQLObjectType('Mutation', {})
    mutation = schema.type_map['Mutation']

    for n, t in schema.type_map.items():
        if n in introspection_types or \
                not is_object_type(t) or \
                n in ['Query', 'Mutation'] or \
                n.startswith('ListOf'):
            continue

        mutation_name = 'create' + upper(n)
        input_type = schema.type_map['DataToCreate' + upper(n)]
        field = GraphQLField(t, {'data': input_type})
        mutation.fields[lower(mutation_name)] = field

    return schema


def insert(field_name, field, fields):
    new_fields = {field_name : field}
    for n, f in fields.items():
        new_fields[n] = f
    return new_fields


def upper(word):
    return word[0].upper() + word[1:]

def lower(word):
    return word[0].lower() + word[1:]