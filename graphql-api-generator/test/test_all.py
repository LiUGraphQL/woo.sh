#!/usr/bin/env python3
import os
import re

import app
from graphql import build_schema, print_schema, GraphQLObjectType, GraphQLNonNull, GraphQLField, GraphQLScalarType, \
    GraphQLArgument, introspection_types
from graphql.pyutils import inspect
# We're one level down, move up.
# print(os.getcwd())
os.chdir('..')
config = app.load_config()

excluded_names = list(introspection_types.keys()) + ['Query', 'Mutation']


def is_modifiable_type(name, cls):
    return name not in excluded_names and isinstance(cls, GraphQLObjectType)


def schema_from_file(schema_file):
    with open(schema_file, 'r', encoding='utf8') as s_file:
        return build_schema(''.join(s_file))


def assert_fail(condition, throwable, error_text):
    try:
        condition()
        assert False, error_text
    except throwable:
        assert True
    except BaseException as e:
        assert False, "Wrong exception thrown. Got {} but expected {}".format(type(e), type(throwable))


def _test_add_id_to_type(schema_in, schema_out):
    for name, cls in schema_in.type_map.items():
        if is_modifiable_type(name, cls):
            # print("::", name)
            assert name in schema_out.type_map,\
                f"All user-defined types must be in the output! Missing {name}."
            cls2 = schema_out.type_map[name]
            assert isinstance(cls2, type(cls)),\
                f"Type {name} in input does not match output! Expected {type(cls)} but got {type(cls2)}."
            cls2_fieldkeys = [k.lower() for k in cls2.fields.keys()]
            assert 'id' in cls2_fieldkeys,\
                f"Type {name} in output does not contain an ID field (case-insensitive)!"
            assert cls2_fieldkeys.count('id') == 1,\
                f"Type {name} contains multiple ID fields!"
            id_key = next(key for key in cls2.fields.keys() if key.lower() == 'id')
            # print(id_key)
            assert isinstance(cls2.fields[id_key], GraphQLField),\
                f"{id_key} is not a proper GraphQLField: found {type(cls2.fields[id_key])}."
            assert isinstance(cls2.fields[id_key].type, GraphQLNonNull), \
                f"{id_key} of {name} must be non-null!"
            assert isinstance(cls2.fields[id_key].type.of_type, GraphQLScalarType), \
                f"{id_key} of {name} must be of scalar type ID!"
            assert cls2.fields[id_key].type.of_type.name == 'ID', \
                f"{id_key} of {name} must be of scalar type ID!"


def _test_add_query_by_id(schema_in, schema_out):
    # Assert query type exists.
    assert schema_out.query_type is not None, "No Query type found!"
    assert schema_out.query_type.name == 'Query', "Query type isn't of type Query?"
    query = schema_out.query_type
    for name, cls in schema_in.type_map.items():
        if is_modifiable_type(name, cls):
            # Assert one query for every user-defined type
            qname = name[0].lower() + name[1:]
            assert qname in query.fields, \
                f"Did not find query for type {name} (as {qname}) by ID!"
            # Assert query by ID only (Human(ID: ID!): Human)
            field = query.fields[qname]
            assert len(field.args.keys()) == 1, \
                f"Type {qname} in query must only take an ID!"
            argkeys = [k.lower() for k in field.args.keys()]
            assert 'id' in argkeys,\
                f"Type {qname} in query does not contain an ID field (case-insensitive)!"
            id_key = next(key for key in field.args.keys() if key.lower() == 'id')
            # Assert query by ID is mandatory.
            id_field = field.args[id_key]
            assert isinstance(id_field, GraphQLArgument), \
                f"Query ID field for {qname} is not an argument, got {type(id_key)}"
            assert isinstance(id_field.type, GraphQLNonNull), \
                f"Query ID field for {qname} must be non-null!"
            assert isinstance(id_field.type.of_type, GraphQLScalarType), \
                f"Query ID field for {qname} must be of type ID!"
            assert id_field.type.of_type.name == 'ID', \
                f"Query ID field for {qname} must be of type ID!"
            # Assert query by ID returns the correct type.
            assert field.type == schema_out.type_map[name], \
                f"Query for {name} by ID must return {name}!"


def _test_add_query_by_type(schema_in, schema_out):
    # Assert query type exists.
    assert schema_out.query_type is not None, "No Query type found!"
    assert schema_out.query_type.name == 'Query', "Query type isn't of type Query?"
    query = schema_out.query_type
    list_of = re.compile(r'^ListOf(.+?)s$')
    for name, cls in schema_in.type_map.items():
        if is_modifiable_type(name, cls):
            list_of_name = f'ListOf{name}s'
            # Assert that all user-defined types also have a listOf{}s type defined
            assert list_of_name in schema_out.type_map, \
                f"Did not find corresponding ListOf{name}s type for {name}!"
            list_type = schema_out.type_map[list_of_name]
            wanted_fields = ['totalCount', 'isEndOfWholeList', 'content']
            wanted_types = ['Int', 'Boolean', f'[{name}]']
            # The following *only* checks to see if all desired fields are in the target.
            # It does not enforce that these are the only fields in the target.
            un_matches = [f for f in wanted_fields if f not in list_type.fields]
            assert len(un_matches) == 0, \
                f"Type {list_of_name} is missing one or more of its required fields: {un_matches}"
            actual_types = [list_type.fields[f].type for f in wanted_fields]
            un_type_matches = [t == inspect(t_) for t, t_ in zip(wanted_types, actual_types)]
            nl = '\n'
            assert all(un_type_matches), f"The following fields had the wrong type for Type {list_of_name}:\n" \
                f"{nl.join([f'Field {f} expected Type {t} but got Type {inspect(t_)}' for f, t, t_ in zip(wanted_fields, wanted_types, actual_types) if t != inspect(t_)])}"
            query_type_name = f'listOf{name}s'
            # Assert one query for every user-defined type
            assert query_type_name in query.fields, \
                f"Did not find {query_type_name} query for type {name}!"
            # Ensure that the query fits the correct argument template:
            # ListOfThings(first:Int, after: ID): ListOfThings
            field = query.fields[query_type_name]
            argkeys = list(field.args.keys())
            assert len(argkeys) == 2, \
                f"Signature of the query '{query_type_name}' should have 2 arguments, instead has {len(argkeys)}"
            needed_fields = ['first', 'after']
            field_types = ['Int', 'ID']

            for f, t in zip(needed_fields, field_types):
                assert f in argkeys,\
                    f"The {query_type_name} query does not contain the field '{f}'!"
                f_args = field.args[f]
                assert isinstance(f_args, GraphQLArgument), \
                    f"Field '{f}' for {query_type_name} is not an argument, got {type(f_args)}"
                assert inspect(f_args.type) == t, \
                    f"Field '{f}' for {query_type_name} must be of type {t}!"
            # Assert query by type returns the correct list type.
            assert field.type == schema_out.type_map[list_of_name], \
                f"The {query_type_name} query must return {list_of_name}!"

# test_file_path = 'resources/test_schemas/sw_no_id.graphql'
test_file_path = 'resources/schema-spirit.graphql'

if config.getboolean('MAIN', 'schema.typeId'):
    def test_add_id_to_type():
        # 1: Should result in a pass iff the output types ALL have ID:ID! fields.
        #    Designed to be case insensitive and enforce the NonNull property.
        schema_in = schema_from_file(test_file_path)
        schema_out = app.add_id_to_type(schema_in)
        _test_add_id_to_type(schema_in, schema_out)
        with open('tmp.graphql', 'w') as outfile:
            outfile.write(print_schema(schema_out))
        schema_out = schema_from_file("tmp.graphql")
        # Now test by printing to file and reading from that file.
        _test_add_id_to_type(schema_in, schema_out)
        os.remove('tmp.graphql')


    def test_add_id_already_exists():
        # Should result in a fail if *any* inputs already have 'ID', 'Id', 'id'
        assert_fail(
            lambda: app.add_id_to_type("resources/test_schemas/sw_with_id.graphql"),
            ValueError,
            "Add ID to type should not allow an ID field in the input.")


if config.getboolean('MAIN', 'schema.makeQuery'):
    def test_add_query_already_exists():
        # Should result in a fail if there is a Query type in the schema already
        assert_fail(
            lambda: app.add_query_by_id("resources/test_schemas/schema_with_query.graphql"),
            ValueError,
            "A Query type is not allowed in the input file!")

    if config.getboolean('QUERY', 'api.query.queryById'):
        def test_add_query_by_id():
            schema_in = schema_from_file(test_file_path)
            schema_in = app.add_id_to_type(schema_in)
            schema_out = app.add_query_by_id(schema_in)
            # Test purely with the objects we've been manipulating
            _test_add_query_by_id(schema_in, schema_out)
            with open('tmp.graphql', 'w') as outfile:
                outfile.write(print_schema(schema_out))
            schema_out = schema_from_file("tmp.graphql")
            # Now test by printing to file and reading from that file.
            _test_add_query_by_id(schema_in, schema_out)
            os.remove('tmp.graphql')
            pass

    if config.getboolean('QUERY', 'api.query.queryByType'):
        def test_add_query_by_type():
            schema_in = schema_from_file(test_file_path)
            schema_in = app.add_id_to_type(schema_in)
            schema_in = app.add_query_by_id(schema_in)
            # Write the 'in' schema so it can be modified...
            with open('tmp_in.graphql', 'w') as outfile:
                outfile.write(print_schema(schema_in))
            schema_out = app.add_query_by_type(schema_in)
            # Read the 'in' schema, since otherwise it will have ListOf...s defined and fail the tests.
            schema_in = schema_from_file("tmp_in.graphql")
            # Test purely with the object we've been manipulating
            with open('tmp_out.graphql', 'w') as outfile:
                outfile.write(print_schema(schema_out))
            _test_add_query_by_type(schema_in, schema_out)
            schema_out = schema_from_file("tmp_out.graphql")
            # Now test by printing to file and reading from that file.
            _test_add_query_by_type(schema_in, schema_out)
            os.remove('tmp_in.graphql')
            os.remove('tmp_out.graphql')
            pass
