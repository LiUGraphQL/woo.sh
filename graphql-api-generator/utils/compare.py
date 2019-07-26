from graphql import build_schema, GraphQLType, is_non_null_type, is_list_type, is_scalar_type, is_enum_type, \
    is_input_object_type, is_object_type, is_interface_type, is_introspection_type, GraphQLSchema


def is_equals_schema(schema_a: GraphQLSchema, schema_b: GraphQLSchema):
    """
    Check to schemas are equivalent.

    TODO:
     - Compare directive definitions
     - Check field directives

    :param schema_a:
    :param schema_b:
    :return:
    """
    # check set of named types
    types_a = set([n for n, t in schema_a.type_map.items() if not is_introspection_type(t)])
    types_b = set([n for n, t in schema_b.type_map.items() if not is_introspection_type(t)])
    if types_a != types_b:
        return False

    # check all named types
    types = types_a
    for type_name in types:
        if not is_equal_type(schema_a.type_map[type_name], schema_b.type_map[type_name]):
            return False

    return True


def is_equal_type(type_a: GraphQLType, type_b: GraphQLType):
    """Check whether two GraphQL types are equivalent."""
    # Check GraphQL base types
    if is_non_null_type(type_a) != is_non_null_type(type_b):
        return False
    if is_list_type(type_a) != is_list_type(type_b):
        return False
    if is_input_object_type(type_a) != is_input_object_type(type_b):
        return False
    if is_object_type(type_a) != is_object_type(type_b):
        return False
    if is_enum_type(type_a) != is_enum_type(type_b):
        return False
    if is_scalar_type(type_a) != is_scalar_type(type_b):
        return False
    if is_interface_type(type_a) != is_interface_type(type_b):
        return False

    # If either type is non-null, the other must also be non-null.
    if is_non_null_type(type_a) and is_non_null_type(type_b):
        return is_equal_type(type_a.of_type, type_b.of_type)

    # If either type is a list, the other must also be a list.
    if is_list_type(type_a):
        return is_equal_type(type_a.of_type, type_b.of_type)

    # Check name
    if type_a.name != type_b.name:
        return False

    # If scalar then done
    if is_scalar_type(type_a):
        return True

    # If enum then check values
    if is_enum_type(type_a):
        # TODO compare values
        return

    # if not interface, check interfaces
    if not is_input_object_type(type_a) and not is_interface_type(type_a):
        interfaces_a = set([i.name for i in type_a.interfaces])
        interfaces_b = set([i.name for i in type_b.interfaces])
        if interfaces_a != interfaces_b:
            return False

    # Check fields
    # 1) Field names
    field_names_a = set([i for i in type_a.fields])
    field_names_b = set([i for i in type_b.fields])
    if field_names_a != field_names_b:
        return False
    # 2) Field types
    field_names = field_names_a
    for field_name in field_names:
        if not is_equal_type(type_a.fields[field_name].type, type_b.fields[field_name].type):
            return False
    # 3) Field argument names and types
    for field_name in field_names:
        arg_names_a = set([i for i in type_a.fields[field_name].args])
        arg_names_b = set([i for i in type_b.fields[field_name].args])
        if arg_names_a != arg_names_b:
            return False
        arg_names = arg_names_a
        for arg_name in arg_names:
            arg_type_a = type_a.fields[field_name].args[arg_name].type
            arg_type_b = type_b.fields[field_name].args[arg_name].type
            if not is_equal_type(arg_type_a, arg_type_b):
                return False

    # TODO: check field directives

    return True