#!/usr/bin/env python3
from ctypes import cast

from graphql import build_schema, introspection_types, is_object_type, GraphQLField, GraphQLScalarType, GraphQLNonNull, \
    GraphQLInputField, GraphQLInputObjectType, is_scalar_type, get_nullable_type, is_list_type, is_nullable_type, \
    is_wrapping_type, get_named_type, GraphQLInputType, GraphQLWrappingType, is_non_null_type, GraphQLList

from graphql import graphql, parse, build_ast_schema

import copy

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
    types = dict(schema.type_map).items()
    for n, t in types:
        if n in introspection_types:
            continue
        elif not is_object_type(t):
            continue
        elif n in ['Query', 'Mutation']:
            continue
        elif n.startswith('ListOf'):
            continue

        schema = add_input_to_create_object(n, t, schema)

    return schema


def sub_wrapped_type(wrapped_type, i):
    # This works for Type, Type!, [Type], [Type]!, or [Type!]
    wrapped_type, outer_nonnull = unwrap_one_layer(wrapped_type, GraphQLNonNull)
    wrapped_type, outer_list = unwrap_one_layer(wrapped_type, GraphQLList)
    wrapped_type, inner_nonnull = unwrap_one_layer(wrapped_type, GraphQLNonNull)

    if inner_nonnull:
        i = GraphQLNonNull(i)
    if outer_list:
        i = GraphQLList(i)
    if outer_nonnull:
        i = GraphQLNonNull(i)

    if isinstance(wrapped_type, GraphQLWrappingType):
        raise Exception('Exception: Multiple layers of nesting are not supported')

    return i


def unwrap_one_layer(wrapped_type, wrapper_type):
    if wrapper_type is GraphQLNonNull:
        if not is_non_null_type(wrapped_type):
            return wrapped_type, False
        else:
            return get_nullable_type(wrapped_type), True
    elif wrapper_type is GraphQLList:
        if not is_list_type(wrapped_type):
            return wrapped_type, False
        else:
            return wrapped_type.of_type, True


def add_input_to_create_object(n, t, schema):
    input_prefix = 'DataToCreate'
    input_fields = {}

    for field_name, field in t.fields.items():
        if is_scalar_type(get_named_type(field.type)):
            field_type = GraphQLInputField(field.type)
        else:
            # if object type, make sure the underlying object exists
            field_type_name = input_prefix + get_named_type(field.type).name

            if field_type_name in schema.type_map:
                field_type = schema.type_map[field_type_name]
            else:
                i = GraphQLInputObjectType(field_type_name, {})
                field_type = sub_wrapped_type(field.type, i)

        input_fields[field_name] = field_type

    name = input_prefix + n
    schema.type_map[name] = GraphQLInputObjectType(name, input_fields)

    return schema


def insert(field_name, field, fields):
    new_fields = {field_name: field}
    for n, f in fields.items():
        new_fields[n] = f
    return new_fields
