#!/usr/bin/env python3
import configparser
from graphql import *


def read_schema_file(input_file):
    with open(input_file, 'r', encoding='utf8') as s_file:
        schema = build_schema(''.join(s_file))
    return schema


def load_config(config_file):
    config = configparser.ConfigParser()
    config.read_file(open(config_file))
    return config


def print_config(config):
    for section in config.sections():
        print('Section: {0}'.format(section));
        for arg in config[section]:
            print('   {0} = {1}'.format(arg, config[section][arg]))


def add_id_to_type(schema):
    id = GraphQLField(GraphQLNonNull(GraphQLID))
    for n, t in schema.type_map.items():
        if n not in introspection_types and is_object_type(t):
            if 'id' in [f.lower() for f in t.fields]:
                raise ValueError('IDs for types should only be defined by the system')
            t.fields = insert('id', id, t.fields)

    return schema


def add_input_to_create_objects(schema):
    types = dict(schema.type_map).items()
    for n, t in types:
        if n in introspection_types or not is_object_type(t) or n in ['Query', 'Mutation'] or n.startswith('ListOf'):
            continue
        schema = add_input_to_create_object(n, t, schema)

    return schema


def add_input_to_update_objects(schema):
    types = dict(schema.type_map).items()
    for n, t in types:
        if n in introspection_types or not is_object_type(t) or n in ['Query', 'Mutation'] or n.startswith('ListOf'):
            continue
        schema = add_input_to_update_object(n, t, schema)

    return schema


def sub_wrapped_type(wrapped_type, i, skip_outer_non_null=False):
    # This works for Type, Type!, [Type], [Type]!, or [Type!]
    wrapped_type, outer_nonnull = unwrap_one_layer(wrapped_type, GraphQLNonNull)
    wrapped_type, outer_list = unwrap_one_layer(wrapped_type, GraphQLList)
    wrapped_type, inner_nonnull = unwrap_one_layer(wrapped_type, GraphQLNonNull)

    if inner_nonnull:
        i = GraphQLNonNull(i)
    if outer_list:
        i = GraphQLList(i)
    if outer_nonnull and not skip_outer_non_null:
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
    input_fields = {}
    for field_name, field in t.fields.items():
        if field_name is 'id':
            continue
        if is_scalar_type(get_named_type(field.type)) or isinstance(get_named_type(field.type), GraphQLEnumType):
            field_type = GraphQLInputField(field.type)
        else:
            # Skip interface fields for now
            if isinstance(get_named_type(field.type), GraphQLInterfaceType):
                continue  # How to handle interfaces in mutations?

            type_name = get_named_type(field.type).name
            # DataToCreate, create placeholder if needed
            data_to_create = 'InputToCreate{0}'.format(upper(type_name))
            if data_to_create not in schema.type_map:
                schema.type_map[data_to_create] = GraphQLInputObjectType(data_to_create, {})
            # DataToConnect<Field>Of<Type>
            connect = GraphQLInputField(GraphQLID)
            create = GraphQLInputField(schema.type_map[data_to_create])
            data_to_connect = 'InputToConnect{0}Of{1}'.format(upper(field_name), upper(n))
            schema.type_map[data_to_connect] = GraphQLInputObjectType(data_to_connect, {'connect': connect,
                                                                                        'create': create})

            field_type = sub_wrapped_type(field.type, schema.type_map[data_to_connect])

        input_fields[field_name] = field_type

    name = 'InputToCreate{0}'.format(upper(n))
    schema.type_map[name] = GraphQLInputObjectType(name, input_fields)

    return schema


def add_input_to_update_object(n, t, schema):
    input_fields = {}
    for field_name, field in t.fields.items():
        if field_name is 'id':
            continue
        if is_scalar_type(get_named_type(field.type)) or isinstance(get_named_type(field.type), GraphQLEnumType):
            field_type = GraphQLInputField(get_nullable_type(field.type))
        else:
            # Skip interface fields for now
            if isinstance(get_named_type(field.type), GraphQLInterfaceType):
                continue  # How to handle interfaces in mutations?

            type_name = get_named_type(field.type).name
            # DataToCreate, create placeholder if needed
            data_to_create = 'InputToCreate{0}'.format(upper(type_name))
            if data_to_create not in schema.type_map:
                schema.type_map[data_to_create] = GraphQLInputObjectType(data_to_create, {})
            # DataToConnect<Field>Of<Type>
            connect = GraphQLInputField(GraphQLID)
            create = GraphQLInputField(schema.type_map[data_to_create])
            data_to_connect = 'InputToConnect{0}Of{1}'.format(upper(field_name), upper(n))
            schema.type_map[data_to_connect] = GraphQLInputObjectType(data_to_connect, {'connect': connect,
                                                                                        'create': create})

            field_type = sub_wrapped_type(field.type, schema.type_map[data_to_connect], True)

        input_fields[field_name] = field_type

    name = 'InputToUpdate{0}'.format(upper(n))
    schema.type_map[name] = GraphQLInputObjectType(name, input_fields)

    return schema


def insert(field_name, field, fields):
    new_fields = {field_name: field}
    for n, f in fields.items():
        new_fields[n] = f
    return new_fields


def add_query_by_id(schema):
    if 'Query' in schema.type_map:
        raise ValueError('Query type should only be defined by the system')

    query = GraphQLObjectType('Query', {})

    id = GraphQLArgument(GraphQLNonNull(GraphQLID))
    for n, t in schema.type_map.items():
        if n not in introspection_types and is_object_type(t):
            field = GraphQLField(t, {'id': id})
            query.fields[lower(n)] = field;

    schema.type_map['Query'] = query
    schema.query_type = query
    return schema


def add_query_by_type(schema):
    if 'Query' not in schema.type_map:
        schema.type_map['Query'] = GraphQLObjectType('Query', {})
    query = schema.type_map['Query']

    # create list types
    total_count = GraphQLField(GraphQLInt)
    is_end_of_whole_list = GraphQLField(GraphQLBoolean)
    types = {}
    for n, t in schema.type_map.items():
        if n in introspection_types or not is_object_type(t) or n in ['Query', 'Mutation']:
            continue
        content = GraphQLField(GraphQLList(t))
        name = 'ListOf{0}s'.format(upper(n))
        _type = GraphQLObjectType(name, {})
        _type.fields['totalCount'] = total_count
        _type.fields['isEndOfWholeList'] = is_end_of_whole_list
        _type.fields['content'] = content
        types[name] = _type

    # add list types
    for n, t in types.items():
        schema.type_map[n] = t

    # add queries for list types
    after = GraphQLArgument(GraphQLID, '')
    first = GraphQLArgument(GraphQLInt, 50)
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
        input_type = schema.type_map['InputToCreate{0}'.format(upper(n))]
        field = GraphQLField(t, {'data': input_type})
        mutation.fields[lower(mutation_name)] = field

    return schema


def add_mutation_for_updating_objects(schema):
    if 'Mutation' not in schema.type_map:
        schema.type_map['Mutation'] = GraphQLObjectType('Mutation', {})
    mutation = schema.type_map['Mutation']

    for n, t in schema.type_map.items():
        if n in introspection_types or not is_object_type(t) or n in ['Query', 'Mutation'] or n.startswith('ListOf'):
            continue

        mutation_name = 'update' + upper(n)
        input_type = schema.type_map['InputToUpdate{0}'.format(upper(n))]
        field = GraphQLField(t, {'id': GraphQLNonNull(GraphQLID), 'data': input_type})
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