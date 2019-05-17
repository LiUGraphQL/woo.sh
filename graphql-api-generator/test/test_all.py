#!/usr/bin/env python3
import os
import app
from graphql import build_schema, GraphQLObjectType, GraphQLNonNull, GraphQLField, GraphQLScalarType
# We're one level down, move up.
# print(os.getcwd())
os.chdir('..')
config = app.load_config()


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
        if name[0:2] != '__' and isinstance(cls, GraphQLObjectType):
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


def test_add_id_to_type():
    # 1: Should result in a pass iff the output types ALL have ID:ID! fields.
    #    Designed to be case insensitive and enforce the NonNull property.
    schema_in = schema_from_file("resources/test_schemas/sw_no_id.graphql")
    schema_out = app.add_id_to_type(schema_in)
    _test_add_id_to_type(schema_in, schema_out)


def test_add_id_already_exists():
    # 2: Should result in a fail if *any* inputs already have 'ID', 'Id', 'id'
    assert_fail(
        lambda: app.add_id_to_type("resources/test_schemas/sw_with_id.graphql"),
        ValueError,
        "Add ID to type should not allow an ID field in the input.")
