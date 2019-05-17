#!/usr/bin/env python3
from graphql import GraphQLSchema, print_schema

from generator import schema_extender
import configparser


def add_id_to_type(data):
    schema = to_schema(data)
    schema = schema_extender.add_id_to_type(schema)
    return schema


def add_query_by_id(data):
    schema = to_schema(data)
    schema = schema_extender.add_query_by_id(schema)
    return schema


def add_query_by_type(data):
    schema = to_schema(data)
    return schema


def add_input_types_to_create_objects(data):
    schema = to_schema(data)
    return schema


def add_mutation_for_creating_objects(data):
    schema = to_schema(data)
    return schema


def to_schema(data):
    if type(data) == str:
        schema = schema_extender.read_schema_file(data)
    elif type(data) == GraphQLSchema:
        schema = data
    else:
        raise ValueError('Expected input to be a schema or input file')

    return schema


def load_config():
    config = configparser.ConfigParser()
    config.read_file(open('resources/config.cfg'))
    return config


def print_config(config):
    for section in config.sections():
        print('Section: {0}'.format(section));
        for arg in config[section]:
            print('   {0} = {1}'.format(arg, config[section][arg]))


def pprint(schema):
    print(print_schema(schema))