#!/usr/bin/env python3

import configparser

def run():
    config = load_config()
    print_config(config)


def add_id_to_type(input_file, output_file, config):
    copy_file(input_file, output_file)


def add_query_by_id(input_file, output_file, config):
    copy_file(input_file, output_file)


def add_query_by_type(input_file, output_file, config):
    copy_file(input_file, output_file)


def add_input_types_to_create_objects(input_file, output_file, config):
    copy_file(input_file, output_file)

def add_mutation_for_creating_objects(input_file, output_file, config):
    copy_file(input_file, output_file)


def copy_file(input_file, output_file):
    with open(input_file, "r") as file_in, open(output_file, "w") as file_out:
        for line in file_in:
            file_out.write(line)




def load_config():
    config = configparser.ConfigParser()
    config.read_file(open("resources/config.cfg"))
    return config


def print_config(config):
    for section in config.sections():
        print("Section: {0}".format(section));
        for arg in config[section]:
            print("   {0} = {1}".format(arg, config[section][arg]))