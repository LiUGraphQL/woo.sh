import os
from unittest import TestCase

from graphql import build_schema

from utils.utils import add_delete_mutations

os.chdir('..')


def all_types_equal(schema_a, schema_b):

    return schema_a.type_map == schema_b.type_map

class Tests(TestCase):
    def test_add_delete_mutations(self):
        schema_in =  build_schema('''
            type Human {
               id: ID!
            }
            type Mutation
        ''')
        expected = build_schema('''
            type Human {
               id: ID!
            }
            type Mutation {
               deleteHuman(id:ID!): Human
            }
        ''')
        #
        schema_out = add_delete_mutations(schema_in)


        assert all_types_equal(expected, schema_out)