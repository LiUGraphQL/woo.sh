#!/usr/bin/env python3

import app

if __name__ == '__main__':
    config = app.load_config()
    schema = app.to_schema('resources/example-schema.graphql')
    schema = app.add_id_to_type(schema)
    schema = app.add_query_by_id(schema)
    app.pprint(schema)