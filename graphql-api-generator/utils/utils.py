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


def is_meta_field(field):
    """
    Returns true if a field should be recognized as a system defined meta data field.
    :param field:
    :return:
    """
    meta_fields = ['_creationDate', '_lastUpdateDate']
    return field in meta_fields


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


def is_db_schema_defined_type(_type: GraphQLType):
    """
    Returns true if _type is a GraphQL type defined in the DB schema.
    :param _type:
    :return:
    """
    if is_input_type(_type) or _type.name.startswith('_') or _type.name == 'Mutation' or _type.name == 'Query':
        return False

    return True


def is_schema_defined_type(_type: GraphQLType):
    """
    Returns true if _type is a schema-defined GraphQL type.
    :param _type:
    :return:
    """
    if is_input_type(_type) or _type.name.startswith('__') or _type.name == 'Mutation' or _type.name == 'Query':
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
        if not is_db_schema_defined_type(_type):
            continue
        if is_interface_type(_type):
            make += f'extend interface {_type.name} {{ id: ID! }} '
        else:
            make += f'extend type {_type.name} {{ id: ID! }} '
    return add_to_schema(schema, make)


def add_creation_date_to_types(schema: GraphQLSchema):
    """
    Extend all object types in the schema with an creationDate field.
    :param schema:
    :return:
    """
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue

        if is_interface_type(_type):
            make += f'extend interface {_type.name} {{ _creationDate: DateTime! }} '
        else:
            make += f'extend type {_type.name} {{ _creationDate: DateTime! }} '
    return add_to_schema(schema, make)


def add_last_update_date_to_types(schema: GraphQLSchema):
    """
    Extend all object types in the schema with an lastUpdateDate field.
    :param schema:
    :return:
    """
    make = ''
    for _type in schema.type_map.values():
        if not is_schema_defined_type(_type):
            continue
        if is_interface_type(_type):
            make += f'extend interface {_type.name} {{ _lastUpdateDate: DateTime }} '
        else:
            make += f'extend type {_type.name} {{ _lastUpdateDate: DateTime }} '
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
        if not is_db_schema_defined_type(_type):
            continue

        for field_name, field_type in _type.fields.items():
            if is_enum_or_scalar(get_named_type(field_type.type)):
                continue

            # Reverse edge
            edge_from = get_named_type(field_type.type)
            edge_name = f'_{field_name}From{_type.name}'

            directives = {}
            directive_to_add = ''

            if hasattr(field_type, 'ast_node') and field_type.ast_node is not None:
                directives = {directive.name.value: directive for directive in field_type.ast_node.directives}
                
            if 'requiredForTarget' in directives:
                directive_to_add = '@required'

            if hasattr(_type, 'interfaces'):
                for interface in _type.interfaces:
                    if field_name in interface.fields.keys():
                        directives = {**directives, **{directive.name.value: directive for directive in interface.fields[field_name].ast_node.directives}}

            if 'uniqueForTarget' in directives:
                edge_to = _type
            else:
                edge_to = GraphQLList(_type)

            if is_interface_type(edge_from):
                make += 'extend interface {0} {{ {1}: {2} {3} }}\n'.format(edge_from, edge_name, edge_to, directive_to_add)
                for implementing_type in schema.get_possible_types(edge_from):
                    make += 'extend type {0} {{ {1}: {2} }}\n'.format(implementing_type, edge_name, edge_to)
            else:
                make += 'extend type {0} {{ {1}: {2} {3} }}\n'.format(edge_from, edge_name, edge_to, directive_to_add)
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
        if not is_db_schema_defined_type(_type) or is_interface_type(_type):
            continue
        make += f'input _InputToCreate{_type.name} '
    schema = add_to_schema(schema, make)

    # add fields to create types
    make = ''
    for _type in schema.type_map.values():
        if not is_db_schema_defined_type(_type) or is_interface_type(_type):
            continue
        make += f'\nextend input _InputToCreate{_type.name} {{\n'
        for field_name, field in _type.fields.items():
            if field_name == 'id' or field_name[0] == '_':
                continue

            inner_field_type = get_named_type(field.type)

            if is_enum_or_scalar(inner_field_type):
                make += f'   {field_name}: {field.type} \n'
            else:
                schema = extend_connect(schema, _type, inner_field_type, field_name)
                connect_name = f'_InputToConnect{capitalize(field_name)}Of{_type.name}'
                connect = copy_wrapper_structure(schema.type_map[connect_name], field.type)
                make += f'   {field_name}: {connect} \n'
        make += '}\n'
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
        if not is_db_schema_defined_type(_type) or is_interface_type(_type):
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
        if not is_db_schema_defined_type(_type):
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
        
    # Get annotations
    edge_from = f'{capitalize(field_name)}EdgeFrom{_type.name}'
    annotate_input = f'_InputToAnnotate{edge_from}'
    annotations = get_field_annotations(_type.fields[field_name])

    if len(annotations) > 0:
        # Make sure the annotation type actually exists first, and prevent us from defining it multiple times
        if annotate_input not in schema.type_map:
            schema = add_to_schema(schema, f'input {annotate_input}{{{annotations}}}')

        make += f'annotations: {annotate_input}'

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
        if not is_db_schema_defined_type(_type) or is_interface_type(_type):
            continue
        update_name = f'_InputToUpdate{_type.name}'
        make += f'input {update_name} '
    schema = add_to_schema(schema, make)

    # Add fields to update type
    make = ''
    for _type in schema.type_map.values():
        if not is_db_schema_defined_type(_type) or is_interface_type(_type):
            continue
        for field_name, field in _type.fields.items():
            if field_name == 'id' or field_name[0] == '_':
                continue

            update_name = f'_InputToUpdate{_type.name}'
            f_type = get_nullable_type(field.type)
            inner_field_type = get_named_type(f_type)

            if is_enum_or_scalar(inner_field_type):
                make += f'extend input {update_name} {{ {field_name}: {f_type} }} \n'
            else:
                # add create or connect field
                connect_name = f'_InputToConnect{capitalize(field_name)}Of{_type.name}'
                connect = copy_wrapper_structure(schema.get_type(connect_name), f_type)
                make += f'extend input {update_name} {{ {field_name}: {connect} }} \n'
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
        if not is_db_schema_defined_type(_type):
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
        if not is_db_schema_defined_type(_type):
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
        if not is_db_schema_defined_type(_type):
            continue
        make += f'extend type Query {{ ' \
            f'   listOf{_type.name}s(first:Int=10, after:ID="", filter:_FilterFor{_type.name}): _ListOf{_type.name}s ' \
            f'}}'
    schema = add_to_schema(schema, make)
    return schema


def add_scalar_filters(schema: GraphQLSchema, config: dict):
    """
    Add filter inputs for GrahpQL types (Hasura-style).
    :param schema:
    :return:
    """
    make = ''
    manually_handled_scalars = ['Int', 'Float', 'String', 'Boolean', 'ID']

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

    # If DateTime is defined as a scalar then create filter (behaves like an integer)
    date_time = schema.type_map.get("DateTime")
    if is_scalar_type(date_time):
        manually_handled_scalars.append('DateTime')
        make += 'input _DateTimeFilter {' \
                '   _eq: DateTime ' \
                '   _neq: DateTime ' \
                '   _in: [DateTime] ' \
                '   _nin: [DateTime] ' \
                '   _gt: DateTime ' \
                '   _egt: DateTime ' \
                '   _lt: DateTime ' \
                '   _elt: DateTime ' \
                '} '

    # Schema-defined scalars
    for scalar_name, scalar in schema.type_map.items():
        if not is_scalar_type(scalar) or scalar_name in manually_handled_scalars:
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
        if not is_db_schema_defined_type(_type):
            continue

        make += f'input _FilterFor{_type.name} {{ ' \
            f'   _and: [_FilterFor{_type.name}] ' \
            f'   _or: [_FilterFor{_type.name}] ' \
            f'   _not: _FilterFor{_type.name} '

        for field_name, field in _type.fields.items():
            if field_name[0] == '_' and not is_meta_field(field_name):
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
        if not is_db_schema_defined_type(_type):
            continue

        for field_name, field in _type.fields.items():

            if not is_list_type(get_nullable_type(field.type)):
                continue

            named_type = get_named_type(field.type)
            if is_enum_or_scalar(named_type):
                continue

            if field_name.startswith('_incoming') or field_name.startswith('_outgoing'):
                filter_name = f'_FilterFor{capitalize(named_type.name[1:])}'
            else:
                filter_name = f'_FilterFor{capitalize(named_type.name)}'

            _filter = schema.type_map[filter_name]
            field.args['filter'] = GraphQLArgument(_filter)
    return schema


def get_field_annotations(field: GraphQLField):
    annotation_fields = []
    for arg, arg_type in field.args.items():
        if arg == 'filter':
            continue
        if not is_enum_or_scalar(get_named_type(arg_type.type)):
            raise Exception("Input object fields are not supported.")
        annotation_fields.append(f'{arg}: {arg_type.type}')
    return " ".join(annotation_fields)


def add_edge_objects(schema: GraphQLSchema):
    make = ''
    for _type in schema.type_map.values():
        if not is_db_schema_defined_type(_type):
            continue
        for field_name, field in _type.fields.items():
            inner_field_type = get_named_type(field.type)
            if field_name.startswith('_') or is_enum_or_scalar(inner_field_type):
                continue
            edge_from = f'{capitalize(field_name)}EdgeFrom{_type.name}'
            annotations = get_field_annotations(field)
            type_type_str = 'type'
            implements_str = ''
            if is_interface_type(_type):
                type_type_str = 'interface'
            elif hasattr(_type, 'interfaces') and _type.interfaces:
                valid_interfaces = []
                for interface in _type.interfaces:
                    if field_name in interface.fields.keys():
                        valid_interfaces.append(interface.name)
                if valid_interfaces:
                    implements_str = f'implements '
                    implements_str += ' & '.join([f'_{capitalize(field_name)}EdgeFrom{interface}' for interface in valid_interfaces])
            make += f'{type_type_str} _{edge_from} {implements_str}{{id:ID! source: {_type.name}! target: {inner_field_type}! {annotations}}}\n'


    schema = add_to_schema(schema, make)
    return schema


def add_fields_for_edge_types(schema: GraphQLSchema, reverse):
    make = ''
    for _type in schema.type_map.values():
        if not is_db_schema_defined_type(_type):
            continue
        for field_name, field in _type.fields.items():
            inner_field_type = get_named_type(field.type)
            if field_name.startswith('_') or is_enum_or_scalar(inner_field_type):
                continue

            edge_from = f'{capitalize(field_name)}EdgeFrom{_type.name}'
            edge_type = schema.get_type('_'+edge_from)
            full_type = copy_wrapper_structure(edge_type, field.type)
            type_type_str = 'type'
            if is_interface_type(_type):
                type_type_str = 'interface'
            make += f'extend {type_type_str} {_type.name} {{ _outgoing{capitalize(field_name)}Edges: {full_type} }}\n'

            if reverse:
                directives = {}
                if hasattr(field, 'ast_node') and field.ast_node is not None:
                    directives = {directive.name.value: directive for directive in field.ast_node.directives}
                    
                if hasattr(_type, 'interfaces'):
                    for interface in _type.interfaces:
                        if field_name in interface.fields.keys():
                            directives = {**directives, **{directive.name.value: directive for directive in interface.fields[field_name].ast_node.directives}}

                if 'uniqueForTarget' in directives:
                    edge_to = edge_type
                else:
                    edge_to = GraphQLList(edge_type)

                inner_connected_types = schema.get_possible_types(inner_field_type) if is_interface_type(inner_field_type) else [inner_field_type]
                for inner_t in inner_connected_types:
                    type_type_str = 'type'
                    if is_interface_type(inner_t):
                        type_type_str = 'interface'
                    make += f'extend {type_type_str} {inner_t.name} {{ _incoming{edge_from}: {edge_to} }}\n'

    schema = add_to_schema(schema, make)
    return schema


def add_filters_for_edge_types(schema: GraphQLSchema):
    """
    Add filters for edges (Hasura-style filters).
    :param schema: schema
    :return: Updated schema
    """
    make = ''
    for _type in schema.type_map.values():
        if not _type.name.startswith('_') or not 'EdgeFrom' in _type.name:
            continue
        
        type_short_name = _type.name[1:]

        make += f'input _FilterFor{type_short_name} {{ ' \
            f'   _and: [_FilterFor{type_short_name}] ' \
            f'   _or: [_FilterFor{type_short_name}] ' \
            f'   _not: _FilterFor{type_short_name} '

        for field_name, field in _type.fields.items():
            if field_name[0] == '_' and not is_meta_field(field_name):
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


def add_input_to_create_edge_objects(schema: GraphQLSchema):
    make = ''
    for _type in schema.type_map.values():
        if not is_db_schema_defined_type(_type) or is_interface_type(_type):
            continue
        connected_types = schema.get_possible_types(_type) if is_interface_type(_type) else [_type]
        for field_name, field in _type.fields.items():
            inner_field_type = get_named_type(field.type)
            if field_name.startswith('_') or is_enum_or_scalar(inner_field_type):
                continue
            for t in connected_types:
                edge_from = f'{capitalize(field_name)}EdgeFrom{t.name}'
                edge_input = f'_InputToCreate{edge_from}'
                annotate_input = f'_InputToAnnotate{edge_from}'
                annotations = get_field_annotations(field)

                if len(annotations) > 0:
                    make += f'input {edge_input} {{sourceID: ID! targetID: ID! annotations: {annotate_input} }}\n'
                    
                    # Make sure the annotation type actually exists first, and prevent us from defining it multiple times
                    if annotate_input not in schema.type_map:
                        make += f'input {annotate_input}{{{annotations}}}\n'
                else:
                    make += f'input {edge_input} {{sourceID: ID! targetID: ID!}}\n'

    schema = add_to_schema(schema, make)
    return schema


def add_mutation_create_edge_objects(schema: GraphQLSchema):
    make = ''
    for _type in schema.type_map.values():
        if not is_db_schema_defined_type(_type) or is_interface_type(_type):
            continue
        connected_types = schema.get_possible_types(_type) if is_interface_type(_type) else [_type]
        for field_name, field in _type.fields.items():
            inner_field_type = get_named_type(field.type)
            if field_name.startswith('_') or is_enum_or_scalar(inner_field_type):
                continue
            for t in connected_types:
                edge_from = f'{capitalize(field_name)}EdgeFrom{t.name}'
                edge_create = f'create{edge_from}'
                edge_input = f'_InputToCreate{edge_from}'
                make += f'extend type Mutation{{{edge_create}(data: {edge_input}):_{edge_from}}}\n'

    schema = add_to_schema(schema, make)
    return schema


def remove_field_arguments_for_types(schema: GraphQLSchema):
    keep_args = ['filter']
    for _type in schema.type_map.values():
        if not is_db_schema_defined_type(_type):
            continue
        for field_name, field in _type.fields.items():
            args = {}
            for arg in field.args:
                if arg in keep_args:
                    args[arg] = field.args[arg]
            field.args = args
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
        if not is_db_schema_defined_type(_type) or is_interface_type(_type):
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
        if not is_db_schema_defined_type(_type) or is_interface_type(_type):
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
        if not is_db_schema_defined_type(_type):
            continue
        delete = f'delete{_type.name}'
        make += f'extend type Mutation {{ {delete}(id: ID!): {_type.name} }} '
    schema = add_to_schema(schema, make)
    return schema


def ast_type_to_string(_type: GraphQLType):
    """
    Print the ast_type properly
    :param _type:
    :return:
    """

    # ast_nodes types behavies differently than other types (as they are NodeTypes)
    # So we can't use the normal functions


    _post_str = ''
    _pre_str = ''
    # A, A!, [A!], [A]!, [A!]!
    wrappers = []
    if isinstance(_type, NonNullTypeNode):
        _post_str = '!'
        _type = _type.type
    if isinstance(_type, ListTypeNode):
        _post_str = ']' + _post_str
        _pre_str = '['
        _type = _type.type
    if isinstance(_type, NonNullTypeNode):
        _post_str = '!' + _post_str
        _type = _type.type
        
    # Dig down to find the actual named node, should be the first one actually
    name = _type
    while not isinstance(name, NamedTypeNode):
        name = name.type
    name = name.name.value

    return _pre_str + name + _post_str


def directive_from_interface(directive, interface_name):
    """
    Return the correct directive string from directives inhertied from interfaces
    :param directive:
    :param interface_name:
    :return string:
    """
    directive_string = directive.name.value

    # The only two cases who needs special attention is @requiredForTarget and @uniqueForTarget
    if directive_string == 'requiredForTarget':
        directive_string = '_requiredForTarget_AccordingToInterface(interface: "' + interface_name + '")'
    elif directive_string == 'uniqueForTarget':
        directive_string = '_uniqueForTarget_AccordingToInterface(interface: "' + interface_name + '")'
    else:
        directive_string += get_directive_arguments(directive)

    return directive_string


def get_directive_arguments(directive):
    """
    Get the arguments of the given directive as string
    :param directive:
    :return string:
    """

    output = ''
    if directive.arguments:
        output+= '(' 
        for arg in directive.arguments:
            output+= arg.name.value + ':'
            if isinstance(arg.value, ListValueNode):
                # List
                output+= '['
                for V in arg.value.values:
                    if isinstance(V, StringValueNode):
                        output+='"' + V.value + '", '
                    else:
                        output+= V.value + ', '

                output = output[:-2] + ']'

            else:
                # Non-list
                if isinstance(arg.value, StringValueNode):
                    output+='"' + arg.value.value + '", '
                else:
                    output+= arg.value.value + ', '

            output += ', '

        output = output[:-2] + ')'

    return output


def get_field_directives(field_name, _type, schema):
    """
    Get the directives of given field, and return them as string
    :param field:
    :param field_name:
    :param _type:
    :param schema:
    :return string:
    """

    output = ''

    # Used to make sure we don't add the same directive multiple times to the same field
    directives_set = set()

    if is_input_type(_type):
        # Get the target type instead (unless it is a filter or delete input, then we dont care)
        # We also ignore @required directives for inputs
        if _type.name[:14] == '_InputToUpdate':
            directives_set.add('required')
            _type = schema.get_type(_type.name[14:])

        elif _type.name[:14] == '_InputToCreate':
            _type = schema.get_type(_type.name[14:])
            directives_set.add('required')

        else: 
            return ''

    # We got type without fields, just return empty
    if not hasattr(_type, 'fields'):
        return ''

    # Get the field from the correct type
    field = _type.fields[field_name]

    # Get all directives directly on field
    for directive in field.ast_node.directives:
        if not directive.name.value in directives_set:
            output+= ' @' + directive.name.value  
            directives_set.add(directive.name.value)
            output += get_directive_arguments(directive)
                            

    if hasattr(_type, 'interfaces'):
        # Get all inherited directives
        for interface in _type.interfaces:
            if field_name in interface.fields:
                for directive in interface.fields[field_name].ast_node.directives:
                    directive_str = directive_from_interface(directive, interface.name)
                    if not directive_str in directives_set:
                        output+= ' @' + directive_str
                        directives_set.add(directive_str)

    return output


def get_type_directives(_type, schema):
    """
    Get the directives of given type, or target type if create- or update-input
    :param type:
    :return string:
    """

    output = ''

    if is_input_type(_type):
        # Get the target type instead (unless it is a filter or delete input, then we dont care)
        if _type.name[:14] == '_InputToUpdate':
            _type = schema.get_type(_type.name[14:])

        elif _type.name[:14] == '_InputToCreate':
            _type = schema.get_type(_type.name[14:])
        else: 
            return ''

    if hasattr(_type, 'ast_node') and _type.ast_node is not None:
        # Get directives on type
        for directive in _type.ast_node.directives:
            output+= ' @' + directive.name.value
            output += get_directive_arguments(directive)

    return output


def get_argument_as_string(arg_name, arg):
    """
    Returns the argument as string ready for output, including default values if existent
    :param arg_name:
    :param arg:
    :return string:
    """

    ret = f'{arg_name}: {arg.type}'

    if arg.default_value != INVALID:
        if isinstance(arg.default_value, str):
            ret += f'="{arg.default_value}"'
        else:
            ret += f'={arg.default_value}'

    return ret


def print_schema_with_directives(schema):
    """
    Outputs the given schema as string, in the format we want it.
    Types and fields will all contain directives
    :param schema:
    :return string:
    """
    manual_directives = {
        'required': 'directive @required on FIELD_DEFINITION',
        'key': 'directive @key(fields: [String!]!) on OBJECT | INPUT_OBJECT',
        'distinct': 'directive @distinct on FIELD_DEFINITION | INPUT_FIELD_DEFINITION',
        'noloops': 'directive @noloops on FIELD_DEFINITION | INPUT_FIELD_DEFINITION',
        'requiredForTarget': 'directive @requiredForTarget on FIELD_DEFINITION | INPUT_FIELD_DEFINITION',
        'uniqueForTarget': 'directive @uniqueForTarget on FIELD_DEFINITION | INPUT_FIELD_DEFINITION',
        '_requiredForTarget_AccordingToInterface': 'directive @_requiredForTarget_AccordingToInterface(interface: String!) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION',
        '_uniqueForTarget_AccordingToInterface': 'directive @_uniqueForTarget_AccordingToInterface(interface: String!) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION'
    }
    output = ''
    # Add directives
    for _dir in schema.directives:
        # Skip non-user defined directives
        if _dir.ast_node is None or _dir.name in manual_directives.keys():
            continue

        output += f'directive @{_dir.name}'
        if _dir.ast_node.arguments:
            args = ', '.join([f'{arg.name.value}: {ast_type_to_string(arg.type)}' for arg in _dir.ast_node.arguments])
            output += f'({args})'

        output += ' on ' + ' | '.join([loc.name for loc in _dir.locations])
        output += '\n\n'
        
    # Manually handled directives
    for _dir in manual_directives.values():
        output += _dir + '\n\n'

    # For each type, and output the types sorted by name
    for _type in sorted(schema.type_map.values(), key=lambda x: x.name):
        # Internal type
        if _type.name.startswith('__'):
            continue

        if is_interface_type(_type):
            output += 'interface ' + _type.name
        elif is_enum_type(_type):
            output += 'enum ' + _type.name
        elif is_scalar_type(_type):
            # Skip non-user defined directives
            if _type.ast_node is not None:
                output += 'scalar ' + _type.name
        elif is_input_type(_type):
            output += 'input ' + _type.name
        else:
            output += 'type ' + _type.name
            if hasattr(_type, 'interfaces') and _type.interfaces:
                output += ' implements '
                output += ' & '.join([interface.name for interface in _type.interfaces])
                
        if is_enum_type(_type):
            # For enums we can get the values directly and add them
            output += ' {\n'
            for value in _type.values: 
                output += '  ' + value + '\n'
            output += '}'

        elif not is_enum_or_scalar(_type):
            # This should be a type, or an interface
            # Get directives on type
            output += get_type_directives(_type, schema)
            output += ' {\n'

            # Get fields
            for field_name, field in _type.fields.items(): 
                output += '  ' + field_name
                
                # Get arguments for field
                if hasattr(field, 'args') and field.args:
                    args = ', '.join([f'{get_argument_as_string(arg_name, arg)}' for arg_name, arg in field.args.items()])
                    output += f'({args})'

                output += ': ' + str(field.type)

                # Add directives
                output += get_field_directives(field_name, _type, schema)
                output += '\n'
           
            output += '}'
        
        if _type.ast_node is not None:
            output += '\n\n'

    return output
