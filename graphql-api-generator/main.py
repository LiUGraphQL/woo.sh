#!/usr/bin/env python3
import generator

files = ['./resources/schema.graphql']
generator.run(','.join(files), None, './resources/config.yml')