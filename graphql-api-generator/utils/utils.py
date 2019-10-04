from graphql import *


def pascal_case(string: str):
    return ''.join([i[0].upper() + i[1:] for i in string.split('_')])


def camel_case(string: str):
    string = pascal_case(string)
    return string[0].lower() + string[1:]


def lowercase(string: str):
    return string.lower()


def uppercase(string: str):
    return string.upper()


def capitalize(string: str):
    """
    Make the first letter of string upper case.
    :param string:
    :return:
    """
    return string[0].upper() + string[1:]


def decapitalize(string: str):
    """
    Make the first letter of string lower case.
    :param string:
    :return:
    """
    return string[0].lower() + string[1:]


def is_schema_defined_type(_type: GraphQLType):
    """
    Returns true if a type is a schema-defined GraphQL type.
    :param _type:
    :return:
    """
    if is_input_type(_type) or _type.name.startswith('_') or _type.name == 'Mutation' or _type.name == 'Query' or _type.name == 'Any':
        return False
    return True


def is_enum_or_scalar(_type: GraphQLType):
    """
    Returns true if a type is an enum or scalar.
    :param _type:
    :return:
    """
    if is_scalar_type(_type) or is_enum_type(_type):
        return True
    return False


def add_query_type(schema: GraphQLSchema):
    return add_to_schema(schema, 'type Query')


def add_mutation_type(schema: GraphQLSchema):
    return add_to_schema(schema, 'type Mutation')


def add_to_schema(schema: GraphQLSchema, make: str):
    if make == '':
        return schema
    try:
        schema = extend_schema(schema, parse(make))
    except TypeError as e:
        print(make)
        print(e)
    except SyntaxError as e:
        print(make)
        print(e)

    return schema


def add_id_to_types(schema: GraphQLSchema):
    """
    Extend all object types in the schema with an ID field.
    :param schema:
    :return:
    """
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue
        if is_interface_type(_type):
            make += f'extend interface {_type.name} {{ id: ID! }} '
        else:
            make += f'extend type {_type.name} {{ id: ID! }} '
    return add_to_schema(schema, make)


def copy_wrapper_structure(_type: GraphQLType, original: GraphQLType):
    """
    Copy the wrapper structure of original to _type.
    :param _type:
    :param original:
    :return:
    """
    wrapped_type = get_named_type(_type)
    # A, A!, [A!], [A]!, [A!]!
    wrappers = []
    if is_non_null_type(original):
        wrappers.insert(0, GraphQLNonNull)
        original = original.of_type
    if is_list_type(original):
        wrappers.insert(0, GraphQLList)
        original = original.of_type
    if is_non_null_type(original):
        wrappers.insert(0, GraphQLNonNull)
        original = original.of_type
    if is_list_type(original):
        wrappers.insert(0, GraphQLList)

    for i in wrappers:
        wrapped_type = i(wrapped_type)

    return wrapped_type


def add_reverse_edges(schema: GraphQLSchema):
    """
    Add reverse edges to all fields with object types.
    :param schema:
    :return:
    """
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue

        for field_name, field_type in _type.fields.items():
            inner_field_type = get_named_type(field_type.type)
            if is_scalar_type(inner_field_type) or is_enum_type(inner_field_type):
                continue

            # Reverse edge
            edge_from = get_named_type(field_type.type)
            edge_name = f'_{field_name}From{_type.name}'
            edge_to = GraphQLList(_type)

            if is_interface_type(edge_from):
                make += 'extend interface {0} {{ {1}: {2} }}\n'.format(edge_from, edge_name, edge_to)
                for implementing_type in schema.get_possible_types(edge_from):
                    make += 'extend type {0} {{ {1}: {2} }}\n'.format(implementing_type, edge_name, edge_to)
            else:
                make += 'extend type {0} {{ {1}: {2} }}\n'.format(edge_from, edge_name, edge_to)
    schema = add_to_schema(schema, make)

    return schema


def add_input_to_create(schema: GraphQLSchema):
    """
    Add create and connect types for creating objects.
    :param schema:
    :return:
    """
    # add create types (placeholders)
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type) or is_interface_type(_type):
            continue
        make += f'input _InputToCreate{_type.name} '
    schema = add_to_schema(schema, make)

    # add fields to create types
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type) or is_interface_type(_type):
            continue
        make += f'\nextend input _InputToCreate{_type.name} {{ '
        for field_name, field in _type.fields.items():
            if field_name == 'id' or field_name[0] == '_':
                continue
            inner_field_type = get_named_type(field.type)
            if is_enum_or_scalar(inner_field_type):
                make += f'{field_name}: {field.type} '
            else:
                schema = extend_connect(schema, _type, inner_field_type, field_name)
                connect_name = f'_InputToConnect{capitalize(field_name)}Of{_type.name}'
                connect = copy_wrapper_structure(schema.type_map[connect_name], field.type)
                make += f'   {field_name}: {connect} '
        make += '} '
    schema = add_to_schema(schema, make)
    return schema


def _get_keys_for_type(type_: GraphQLType):
    keys = []
    if hasattr(type_, 'ast_node') and type_.ast_node is not None:
        directives = {directive.name.value: directive for directive in type_.ast_node.directives}
        if 'key' in directives:
            arguments = {arg.name.value: arg for arg in directives['key'].arguments}
            if 'fields' in arguments:
                keys.append([val.value for val in arguments['fields'].value.values])
    return keys


def add_the_any_type(schema: GraphQLSchema):
    """
    Add create and connect types for creating objects.
    :param schema:
    :return:
    """
    # add create types (placeholders)
    schema = add_to_schema(schema, 'type Any')
    extend_fields = f'extend type Any {{'
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type) or is_interface_type(_type):
            continue
        extend_fields += f'create{_type.name}: [{_type.name}!] '
        extend_fields += f'update{_type.name}: [{_type.name}!] '
    extend_fields += '} '
    schema = add_to_schema(schema, extend_fields)
    return schema


def add_key_input_types(schema: GraphQLSchema):
    """
    Add create and connect types for creating objects.
    :param schema:
    :return:
    """
    # add create types (placeholders)
    make_types = ''
    extend_fields = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type) or is_interface_type(_type):
            continue
        keys = _get_keys_for_type(_type)
        # TODO: Modify this when we need to handle multiple keys.
        if len(keys) > 0:
            for key in keys[:1]:
                make_types += f'input _KeyFor{_type.name} '
                extend_fields += f'\nextend input _KeyFor{_type.name} {{ '
                for key_field in key:
                    if key_field not in _type.fields:
                        raise Exception(f'Field "{key_field}" in @key directive for {_type} is not a field of {_type}!')
                for field_name, field in _type.fields.items():
                    # TODO: Modify this if we need to verify that the key fields are in the object
                    if field_name not in key:
                        continue
                    extend_fields += f'{field_name}: {field.type} '
                extend_fields += '} '
    schema = add_to_schema(schema, make_types)
    schema = add_to_schema(schema, extend_fields)
    return schema


def add_key_queries(schema: GraphQLSchema):
    """
    Add query to get object based on ID.
    :param schema:
    :return:
    """
    # Create queries for object types
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue
        keys = _get_keys_for_type(_type)
        # TODO: Handle multiple keys here, somehow.
        if len(keys) > 0:
            # for key in keys[:1]:
            query_name = f'{decapitalize(_type.name)}ByKey'
            key_type = f'_KeyFor{_type.name}'
            make += f'extend type Query {{ {query_name}(key:{key_type}!): {_type.name} }} '
    schema = add_to_schema(schema, make)
    return schema


def extend_connect(schema: GraphQLSchema, _type: GraphQLType, field_type: GraphQLType, field_name: str):
    """
    Add connect type.
    :param schema:
    :param _type:
    :param field_type:
    :param field_name:
    :return:
    """
    create_name = f'_InputToCreate{field_type.name}'
    connect_name = f'_InputToConnect{capitalize(field_name)}Of{_type.name}'
    make = f'input {connect_name} {{ '
    make += 'connect: ID '

    # if interface
    if is_interface_type(field_type):
        # add fields for all implementing types
        for implementing_type in schema.get_possible_types(field_type):
            create_field = f'create{implementing_type.name}'
            create_implementing_type = f'_InputToCreate{implementing_type.name}'
            make += f'{create_field} : {create_implementing_type} '
    else:
        make += f'create: {create_name} '
    make += '}'
    schema = add_to_schema(schema, make)
    return schema


def add_input_update(schema: GraphQLSchema):
    """
    Add update types for updating objects.
    :param schema:
    :return:
    """
    # Create update inputs
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type) or is_interface_type(_type):
            continue
        update_name = f'_InputToUpdate{_type.name}'
        make += f'input {update_name} '
    schema = add_to_schema(schema, make)

    # Add fields to update type
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type) or is_interface_type(_type):
            continue
        for field_name, field in _type.fields.items():
            if field_name == 'id' or field_name[0] == '_':
                continue

            update_name = f'_InputToUpdate{_type.name}'
            f_type = get_nullable_type(field.type)
            inner_field_type = get_named_type(f_type)

            if is_enum_or_scalar(inner_field_type):
                make += f'extend input {update_name} {{ {field_name}: {f_type} }} '
            else:
                # add create or connect field
                connect_name = f'_InputToConnect{capitalize(field_name)}Of{_type.name}'
                connect = copy_wrapper_structure(schema.get_type(connect_name), f_type)
                make += f'extend input {update_name} {{ {field_name}: {connect} }} '
    schema = add_to_schema(schema, make)
    return schema


def add_get_queries(schema: GraphQLSchema):
    """
    Add query to get object based on ID.
    :param schema:
    :return:
    """
    # Create queries for object types
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue
        make += f'extend type Query {{ {decapitalize(_type.name)}(id:ID!): {_type.name} }} '
    schema = add_to_schema(schema, make)
    return schema


def add_list_of_types(schema: GraphQLSchema):
    """
    Add list type to represent lists of all types and support paging.
    :param schema:
    :return:
    """
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue

        make += f'type _ListOf{_type.name}s {{ ' \
            f'   totalCount: Int! ' \
            f'   isEndOfWholeList: Boolean! ' \
            f'   content: [{_type.name}]!' \
            f'}} '
    schema = add_to_schema(schema, make)
    return schema


def add_list_queries(schema: GraphQLSchema):
    """
    Add queries to get list of types.
    :param schema:
    :return:
    """
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue
        make += f'extend type Query {{ ' \
            f'   listOf{_type.name}s(first:Int=10, after:ID="", filter:_FilterFor{_type.name}): _ListOf{_type.name}s ' \
            f'}}'
    schema = add_to_schema(schema, make)
    return schema


def add_scalar_filters(schema: GraphQLSchema):
    """
    Add filter inputs for GrahpQL types (Hasura-style).
    :param schema:
    :return:
    """
    make = ''
    # Numeric
    scalars = ['Int', 'Float']
    for scalar in scalars:
        make += f'input _{scalar}Filter {{' \
               f'   _eq: {scalar} ' \
               f'   _neq: {scalar} ' \
               f'   _gt: {scalar} ' \
               f'   _egt: {scalar} ' \
               f'   _lt: {scalar} ' \
               f'   _elt: {scalar} ' \
               f'   _in: [{scalar}] ' \
               f'   _nin: [{scalar}] ' \
               f'}} '

    # String
    make += 'input _StringFilter {' \
            '   _eq: String ' \
            '   _neq: String ' \
            '   _gt: String ' \
            '   _egt: String ' \
            '   _lt: String ' \
            '   _elt: String ' \
            '   _in: [String] ' \
            '   _nin: [String] ' \
            '   _like: String ' \
            '   _ilike: String ' \
            '   _nlike: String ' \
            '   _nilike: String ' \
            '} '

    # ID (behaves like a string)
    make += 'input _IDFilter {' \
            '   _eq: String ' \
            '   _neq: String ' \
            '   _gt: String ' \
            '   _egt: String ' \
            '   _lt: String ' \
            '   _elt: String ' \
            '   _in: [String] ' \
            '   _nin: [String] ' \
            '   _like: String ' \
            '   _ilike: String ' \
            '   _nlike: String ' \
            '   _nilike: String ' \
            '} '

    # Boolean
    make += 'input _BooleanFilter {' \
            '   _eq: Boolean ' \
            '   _neq: Boolean ' \
            '} '

    # Schema-defined scalars
    for scalar_name, scalar in schema.type_map.items():
        if not is_scalar_type(scalar) or scalar_name in ['Int', 'Float', 'String', 'Boolean', 'ID']:
            continue

        make += f'input _{scalar_name}Filter {{' \
               f'   _eq: {scalar_name} ' \
               f'   _neq: {scalar_name} ' \
               f'   _in: [{scalar_name}] ' \
               f'   _nin: [{scalar_name}] ' \
               f'}} '

    schema = add_to_schema(schema, make)

    return schema


def add_type_filters(schema: GraphQLSchema):
    """
    Add filter types (Hasura-style filters).
    :param schema: schema
    :return: Updated schema
    """
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue

        make += f'input _FilterFor{_type.name} {{ ' \
            f'   _and: [_FilterFor{_type.name}] ' \
            f'   _or: [_FilterFor{_type.name}] ' \
            f'   _not: _FilterFor{_type.name} '

        for field_name, field in _type.fields.items():
            if field_name[0] == '_':
                continue

            # remove outer required
            f_type = field.type
            if is_non_null_type(f_type):
                f_type = field.type.of_type

            # filters are not supported for lists
            if is_list_type(field.type):
                continue

            named_type = get_named_type(f_type)
            if is_enum_or_scalar(f_type):
                make += f'{field_name}: _{named_type.name}Filter '
        make += '} '
    schema = add_to_schema(schema, make)
    return schema


def add_object_type_filters(schema: GraphQLSchema):
    """
    Add filters as arguments to list field of object types.
    :param schema:
    :return:
    """
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue

        for field_name, field in _type.fields.items():

            if not is_list_type(get_nullable_type(field.type)):
                continue

            named_type = get_named_type(field.type)
            if is_enum_or_scalar(named_type) or is_interface_type(named_type):
                continue
            filter_name = f'_FilterFor{capitalize(named_type.name)}'
            _filter = schema.type_map[filter_name]
            field.args['filter'] = GraphQLArgument(_filter)
    return schema


def remove_field_arguments_for_types(schema: GraphQLSchema):
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue
        for field_name, field in _type.fields.items():
            field.args = {}
    return schema


def add_enum_filters(schema: GraphQLSchema):
    """
    Add filter inputs for enums (Hasura-style).
    :param schema:
    :return:
    """
    make = ''
    for enum_name, enum in schema.type_map.items():
        if not is_enum_type(enum) or is_introspection_type(enum):
            continue

        make += f'input _{enum_name}Filter {{' \
            f'   _eq: {enum_name} ' \
            f'   _neq: {enum_name} ' \
            f'   _in: [{enum_name}] ' \
            f'   _nin: [{enum_name}] ' \
            f'}} '
    schema = add_to_schema(schema, make)
    return schema


def add_create_mutations(schema: GraphQLSchema):
    """
    Add mutations for creating object types.
    :param schema:
    :return:
    """
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type) or is_interface_type(_type):
            continue
        create = f'create{_type.name}'
        input_type = f'_InputToCreate{_type.name}'
        make += f'extend type Mutation {{ {create}(data: {input_type}!): {_type.name} }} '
    schema = add_to_schema(schema, make)

    return schema


def add_update_mutations(schema: GraphQLSchema):
    """
    Add mutations for updating object types.
    :param schema:
    :return:
    """
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type) or is_interface_type(_type):
            continue
        update = f'update{capitalize(_type.name)} '
        input_type = f'_InputToUpdate{_type.name}'
        make += f'extend type Mutation {{ {update}(id: ID!, data: {input_type}!): {_type.name} }} '
    schema = add_to_schema(schema, make)

    return schema


def add_delete_mutations(schema: GraphQLSchema):
    """
    Add mutations for deleting object types.
    :param schema:
    :return:
    """
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue
        delete = f'delete{_type.name}'
        make += f'extend type Mutation {{ {delete}(id: ID!): {_type.name} }} '
    schema = add_to_schema(schema, make)
    return schema


def add_the_many_mutation(schema: GraphQLSchema):
    """
    Add mutations for deleting object types.
    :param schema:
    :return:
    """
    make = ''
    make += f'extend type Mutation {{ many('
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type) or is_interface_type(_type):
            continue
        make += f'create{_type.name}: [_InputToCreate{_type.name}!]\n'
        make += f'update{capitalize(_type.name)}: [_InputToUpdate{_type.name}!]\n'
    make += '): Any } '
    schema = add_to_schema(schema, make)
    return schema
