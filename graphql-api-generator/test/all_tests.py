from unittest import TestCase
from graphql import build_schema
import generator
from utils import compare

# TODO Many tests...


class Tests(TestCase):
    def test_add_id_1(self):
        schema_in = build_schema('''
            type Human
        ''')
        config = {'generation': {'field_for_id': True}}
        expected = build_schema('''
            type Human {
                id: ID!
            }
        ''')
        schema_out = generator.run(schema_in, config)
        assert compare.is_equals_schema(schema_out, expected)

    def test_add_id_2(self):
        schema_in = build_schema('''
            type Human { id: ID! }
        ''')
        config = {'generation': {'field_for_id': True}}
        try:
            generator.run(schema_in, config)
            assert False
        except:
            assert True

    def test_add_input_to_create_1(self):
        schema_in = build_schema('''
            type Human {
                id: ID!
                name: String!
            }
        ''')
        config = {'generation': {'input_to_create_objects': True}}
        expected = build_schema('''
            type Human { 
                id: ID!
                name: String!
            }
            input _InputToCreateHuman {
                name: String!
            }
        ''')
        schema_out = generator.run(schema_in, config)
        assert compare.is_equals_schema(schema_out, expected)

    def test_add_crationDate_1(self):
        schema_in = build_schema('''
            type Test
        ''')
        config = {'generation': {'field_for_creation_date': True}}
        expected = build_schema('''
           scalar DateTime
           type Test {
               _creationDate: DateTime!
           }
        ''')
        schema_out = generator.run(schema_in, config)
        assert compare.is_equals_schema(schema_out, expected)

    def test_add_lastUpdateDate_1(self):
        schema_in = build_schema('''
           type Test
        ''')
        config = {'generation': {'field_for_last_update_date': True}}
        expected = build_schema('''
           scalar DateTime
           type Test {
               _lastUpdateDate: DateTime
           }
        ''')
        schema_out = generator.run(schema_in, config)
        assert compare.is_equals_schema(schema_out, expected)

    def test_datetime_scalar_1(self):
        schema_in = build_schema('''
            type datetime_test
        ''')
        config = {'generation': {'generate_datetime': True}}
        try:
            run(schema_in, config)
            assert True
        except:
            assert False

    def test_datetime_scalar_2(self):
        schema_in = build_schema('''
            scalar DateTime
            type datetime_test { date: DateTime! }
        ''')
        config = {'generation': {'generate_datetime': True}}
        try:
            generator.run(schema_in, config)
            assert True
        except:
            assert False

    def test_datetime_scalar_3(self):
        schema_in = build_schema('''
            type DateTime {
                date: String!
                time: String!
            }
            type datetime_test { date: DateTime! }
        ''')
        config = {'generation': {'generate_datetime': True}}
        try:
            generator.run(schema_in, config)
            assert False
        except:
            assert True