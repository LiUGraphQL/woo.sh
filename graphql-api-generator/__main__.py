#!/usr/bin/env python3

import app

if __name__ == '__main__':
    config = app.load_config()
    schema = app.add_id_to_type('resources/example-schema.graphql')
