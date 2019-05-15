#!/usr/bin/env python3
from graphql import GraphQLSchema, print_schema

from generator import schema_extender
import configparser

def add_id_to_type(input):
    if type(input) == str:
        schema = schema_extender.read_schema_file(input)
    elif type(input) == GraphQLSchema:
        schema = input
    else:
        raise ValueError('Expected input to be a schema or input file')

    schema = schema_extender.add_id_to_type(schema)
    #print(print_schema(schema))

    return schema


def add_query_by_id(input):
    if type(input) == str:
        schema = schema_extender.read_schema_file(input)
    elif type(input) == GraphQLSchema:
        schema = input
    else:
        raise ValueError('Expected input to be a schema or input file')

    return schema


def add_query_by_type(input):
    if type(input) == str:
        schema = schema_extender.read_schema_file(input)
    elif type(input) == GraphQLSchema:
        schema = input
    else:
        raise ValueError('Expected input to be a schema or input file')

    return schema


def add_input_types_to_create_objects(input):
    if type(input) == str:
        schema = schema_extender.read_schema_file(input)
    elif type(input) == GraphQLSchema:
        schema = input
    else:
        raise ValueError('Expected input to be a schema or input file')

    return schema


def add_mutation_for_creating_objects(input):
    if type(input) == str:
        schema = schema_extender.read_schema_file(input)
    elif type(input) == GraphQLSchema:
        schema = input
    else:
        raise ValueError('Expected input to be a schema or input file')

    return schema


def copy_file(input_file, output_file):
    with open(input_file, 'r') as file_in, open(output_file, 'w') as file_out:
        for line in file_in:
            file_out.write(line)


def load_config():
    config = configparser.ConfigParser()
    config.read_file(open('resources/config.cfg'))
    return config


def print_config(config):
    for section in config.sections():
        print('Section: {0}'.format(section));
        for arg in config[section]:
            print('   {0} = {1}'.format(arg, config[section][arg]))