from typing import Callable
from itertools import chain

from graphql import GraphQLSchema, GraphQLNamedType, GraphQLDirective, is_specified_directive, is_input_type, \
    is_scalar_type
from graphql.utilities.schema_printer import print_schema_definition, print_directive, print_type, is_defined_type


def print_schema(schema: GraphQLSchema) -> str:
    return print_filtered_schema(
        schema, lambda n: not is_specified_directive(n), is_defined_type
    )


def print_filtered_schema(
    schema: GraphQLSchema,
    directive_filter: Callable[[GraphQLDirective], bool],
    type_filter: Callable[[GraphQLNamedType], bool],
) -> str:
    directives = filter(directive_filter, schema.directives)
    type_map = schema.type_map
    types = filter(type_filter, map(type_map.get, sorted(type_map)))  # type: ignore

    mutation_and_query = ['Query', 'Mutation']
    object_types = []
    enum_types = []
    scalar_types = []
    input_types = []
    for t in types:
        if t.name not in ['Query', 'Mutation']:
            if is_input_type(t) and not is_scalar_type(t):
                input_types.append(t.name)
    input_types.sort()
    #print(input_types)

    return (
        "\n\n".join(
            chain(
                filter(None, [print_schema_definition(schema)]),
                (print_directive(directive) for directive in directives),
                (print_type(type_) for type_ in types),  # type: ignore
            )
        )
        + "\n"
    )