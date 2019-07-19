from unittest import TestCase
from graphql import build_schema
import generator
from utils import compare

# TODO Many tests...

class Tests(TestCase):
    def test_add_id_success(self):
        schema_in = build_schema('type Human')
        config = {
            'generation': {
                'field_for_id': True
            }
        }
        expected = build_schema('type Human { id: ID!  }')
        schema_out = generator.run(schema_in, config)
        assert compare.is_equals_schema(schema_out, expected)