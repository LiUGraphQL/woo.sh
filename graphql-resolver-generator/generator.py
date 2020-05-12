import argparse
from graphql import build_schema, is_object_type, get_named_type, is_interface_type
from mako.template import Template


def is_schema_defined_object_type(_type):
    return is_object_type(_type) and _type.name[0] != '_' and _type.name not in ['Mutation', 'Query']


def is_edge_type(_type):
    return 'EdgeFrom' in _type.name


def camelCase(s):
    return s[0].lower() + s[1:]


def pascalCase(s):
    return s[0].upper() + s[1:]


def generate(input_file, output_dir):
    # load schema
    with open(input_file, 'r') as f:
        schema_string = f.read()
    schema = build_schema(schema_string)

    data = {'types': [], 'types_by_key': [], 'interfaces': []}

    # get list of types
    for type_name, _type in schema.type_map.items():
        if is_interface_type(_type):
            data['interfaces'].append(type_name)
        if is_edge_type(_type):
            continue
        if is_schema_defined_object_type(_type):
            t = {
                'Name': type_name,
                'name': camelCase(type_name),
                'fields': [],
                'edgeFields': [],
                'DateTime': [],
                'hasKeyDirective': f'_KeyFor{type_name}' in schema.type_map.keys()
            }
            # add object fields
            for field_name, field_type in _type.fields.items():
                inner_field_type = get_named_type(field_type.type)
                if is_schema_defined_object_type(inner_field_type) or is_interface_type(inner_field_type):
                    t['fields'].append(field_name)
                if inner_field_type.name == 'DateTime':
                    t['DateTime'].append(field_name)
                if field_name[0] == '_':
                    continue
                if is_schema_defined_object_type(inner_field_type) or is_interface_type(inner_field_type):
                    t['edgeFields'].append((pascalCase(field_name), inner_field_type))
            data['types'].append(t)

    # sort
    data['types'].sort(key=lambda x: x['name'])
    data['interfaces'].sort()

    # apply template
    template = Template(filename=f'resources/resolver.template')
    if output_dir is None:
        print(template.render(data=data))
    else:
        with open(f'{output_dir}/resolvers.js', 'w') as f:
            f.write(template.render(data=data))


def cmd(args):
    generate(args.input, args.output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=str, required=True,
                        help='GraphQL API schema file')
    parser.add_argument('--output', type=str,
                        help='Output directory for resolver.js file')
    cmd(parser.parse_args())
