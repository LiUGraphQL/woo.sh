#!/usr/bin/env python3
import gen

if __name__ == '__main__':
    gen.run('resources/schema.graphql', 'resources/schema-api.graphql', 'resources/config.cfg')
