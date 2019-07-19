# pgschema-to-apischema
The tool in this repository extends a schema for Property Graphs into a GraphQL schema for a GraphQL API, where [the Property Graph schema is assumed to be represented using the GraphQL Schema Definition Language (SDL)](http://blog.liu.se/olafhartig/documents/graphql-schemas-for-property-graphs/).

## Example
```bash
$ python3 graphql-api-generator/generator.py \
      --input ./my-schema.graphql \
      --output ./my-api-schema.graphql \
      --normalize true \
      --config ./config.cfg
```

## Usage
```bash
$ python3 graphql-api-generator/generator.py --h

usage: generator.py [-h] --input INPUT [--output OUTPUT]
                    [--normalize NORMALIZE] --config CONFIG

optional arguments:
  -h, --help            show this help message and exit
  --input INPUT         Input schema files (separated by commas)
  --output OUTPUT       Output schema file (default stdout)
  --normalize NORMALIZE
                        Normalize naming of types and fields (default false)
  --config CONFIG       Path to configuration file
```


## Configuration
The configuration file controls the features that are enabled during the generation process. For example:
```properties
[MAIN]
;; add id field to all schema types
schema.fieldForId = yes
;; add reverse edges for traversal
schema.reverseEdges = yes
;; add edge types and new type fields
schema.edgeTypes = no
schema.fieldsForEdgeTypes = no

[QUERY]
schema.queryById = yes
schema.queryListOf = yes

[MUTATION]
;; input types
schema.inputToCreateObjects = yes
schema.inputToUpdateObjects = yes

;; input for edge types
schema.inputToCreateEdgeObjects = no
schema.inputToUpdateEdgeObjects = no

;; mutation for types
schema.createObjects = yes
schema.updateObjects = yes
schema.deleteObjects = yes

;; mutation for edge types
schema.createEdgeObjects = no
schema.updateEdgeObjects = no
schema.deleteEdgeObjects = no

```
