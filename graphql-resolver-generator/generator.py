import argparse

import yaml
from graphql import build_schema, is_object_type, get_named_type, is_interface_type, assert_valid_schema, is_input_type
from mako.template import Template

import sys
sys.path.insert(1, '../graphql-api-generator')
from utils.utils import is_enum_or_scalar


def is_schema_defined_object_type(_type):
    return is_object_type(_type) and _type.name[0] != '_' and _type.name not in ['Mutation', 'Query']


def is_edge_type(_type):
    return not is_input_type(_type) and 'EdgeFrom' in _type.name


def camelCase(s):
    return s[0].lower() + s[1:]


def pascalCase(s):
    return s[0].upper() + s[1:]


def generate(input_file, output_dir, config: dict):
    # load schema
    with open(input_file, 'r') as f:
        schema_string = f.read()
    schema = build_schema(schema_string)

    data = {'types': [], 'types_by_key': [], 'interfaces': [], 'edge_types_to_delete': [], 'edge_types_to_update': [], 'edge_objects': []}

    # get list of types
    for type_name, _type in schema.type_map.items():
        if is_interface_type(_type):
            data['interfaces'].append(type_name)
        if is_edge_type(_type):
            if config.get('generation').get('query_edge_by_id'):
                data['edge_objects'].append(type_name)
        if is_schema_defined_object_type(_type):
            t = {
                'Name': type_name,
                'name': camelCase(type_name),
                'fields': [],
                'edgeFields': [],
                'edgeFieldEndpoints': [],
                'DateTime': [],
                'hasKeyDirective': f'_KeyFor{type_name}' in schema.type_map.keys()
            }
            # add object fields
            for field_name, field_type in _type.fields.items():
                inner_field_type = get_named_type(field_type.type)
                if field_name.startswith('_incoming') or field_name.startswith('_outgoing'):
                    t['edgeFields'].append(field_name)
                elif is_schema_defined_object_type(inner_field_type) or is_interface_type(inner_field_type):
                    t['fields'].append(field_name)
                if inner_field_type.name == 'DateTime':
                    t['DateTime'].append(field_name)
                if field_name[0] == '_':
                    continue
                if is_schema_defined_object_type(inner_field_type) or is_interface_type(inner_field_type):
                    t['edgeFieldEndpoints'].append((pascalCase(field_name), inner_field_type))

                    if config.get('generation').get('delete_edge_objects'):
                        data['edge_types_to_delete'].append((f'{pascalCase(field_name)}EdgeFrom{type_name}', type_name))

                    if config.get('generation').get('update_edge_objects'):
                        if is_there_field_annotations(schema.type_map[f'_{pascalCase(field_name)}EdgeFrom{type_name}']):
                            data['edge_types_to_update'].append((f'{pascalCase(field_name)}EdgeFrom{type_name}', type_name))


            sort_before_rendering(t)
            data['types'].append(t)

    # sort
    data['types'].sort(key=lambda x: x['name'])
    data['interfaces'].sort()
    data['edge_types_to_delete'].sort()
    data['edge_types_to_update'].sort()
    data['edge_objects'].sort()

    # apply template
    template = Template(filename=f'resources/resolver.template')
    if output_dir is None:
        print(template.render(data=data))
    else:
        with open(f'{output_dir}/resolvers.js', 'w') as f:
            updated_schema_string = template.render(data=data)
            api_schema = build_schema(schema_string)
            assert_valid_schema(api_schema)
            f.write(updated_schema_string)


def is_there_field_annotations(_type):
    """
    Check if a given type contains fields that does not start with '_' and are of enum or scalar type
    These fields should be annotations
    :param type:
    :return boolean:
    """
    for field_name, field_type in _type.fields.items():
        if field_name.startswith('_') or field_name == 'id':
            continue
        if is_enum_or_scalar(get_named_type(field_type.type)):
            return True
    return False


def sort_before_rendering(d: dict):
    """
    Sort all list values in the dictionary to allow consistent generation of resolver files.
    :param d:
    :return:
    """
    for k in d:
        if type(d[k]) is not list or not len(d[k]):
            continue
        if type(d[k][0] == tuple):
            d[k].sort(key=lambda x: x[0].replace("_", "}"))
        else:
            d[k].sort(key=lambda x: x.replace("_", "}"))


def cmd(args):
    # load config
    config = {}
    if args.config:
        with open(args.config) as f:
            config = yaml.safe_load(f)

    generate(args.input, args.output, config)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=str, required=True,
                        help='GraphQL API schema file')
    parser.add_argument('--output', type=str,
                        help='Output directory for resolver.js file')
    parser.add_argument('--config', type=str,
                        help='Path to configuration file')
    cmd(parser.parse_args())
