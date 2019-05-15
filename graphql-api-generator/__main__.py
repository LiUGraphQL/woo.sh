#!/usr/bin/env python3
import configparser

# Should we:
#   make config global/static for all other classes
#   provide config as arg where necessary
#   or have all modules load it themselves

def run():
    config = load_config()
    print_config(config)

def load_config():
    config = configparser.ConfigParser()
    config.read_file(open("resources/config.cfg"))
    return config

def print_config(config):
    for section in config.sections():
        print("Section: {0}".format(section));
        for arg in config[section]:
            print("   {0} = {1}".format(arg, config[section][arg]))






if __name__ == '__main__':
    run()