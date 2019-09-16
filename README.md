# pgschema-to-apischema
The tool in this repository extends a schema for Property Graphs into a GraphQL schema for a GraphQL API, where [the Property Graph schema is assumed to be represented using the GraphQL Schema Definition Language (SDL)](http://blog.liu.se/olafhartig/documents/graphql-schemas-for-property-graphs/). The actual approach to extend the Property Graph schemas into GraphQL API schemas (as implemented by this tool) is documented in the [wiki of this repo](https://github.com/LiUGraphQL/pgschema-to-apischema/wiki).

## Example
```bash
$ python3 generator.py \
      --input resources/schema.graphql \
      --output api-schema.graphql \
      --config resources/config.yml
```

## Usage
```bash
$ python3 generator.py --help
usage: generator.py [-h] --input INPUT [--output OUTPUT] [--config CONFIG]

optional arguments:
  -h, --help       show this help message and exit
  --input INPUT    Input schema files (separated by commas)
  --output OUTPUT  Output schema file (default stdout)
  --config CONFIG  Path to configuration file
```


## Configuration
The configuration file controls the features that are enabled during the generation process. For example:
```yaml
transform:
    type_names: PascalCase
    field_names: camelCase
    enum_values: uppercase
    drop_comments: true
generation:
    add_query_type: true
    add_mutation_type: true
    # add id field to all schema types
    field_for_id: true
    # add reverse edges for traversal
    reverse_edges: true
    # add edge types
    edge_types: false
    fields_for_edge_types: false
    # add queries
    query_by_id: true
    query_list_of: true
    # add input types
    input_to_create_objects: true
    input_to_update_objects: true
    # add edge input types (not supported)
    input_to_create_edge_objects: false
    input_to_update_edge_objects: false
    # add mutations
    create_objects: true
    update_objects: true
    delete_objects: false
    # add edge mutations (not supported)
    create_edge_objects: false
    update_edge_objects: false
    delete_edge_objects: false
```
