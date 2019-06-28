#!/usr/bin/env python3
import generator

files = ['./resources/schema.graphql']
generator.run(','.join(files), None, True, './resources/config.cfg')
#generator.run(','.join(files), './resources/api-schema.graphql', True)