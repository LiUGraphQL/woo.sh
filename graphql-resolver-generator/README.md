# graphql-resolver-generator
This tool generates a file containing resolver functions based on a GraphQL API
schema. The generated file, along with the GraphQL API schema, is intended as the
basis for setting up an [Apollo GraphQL](https://www.apollographql.com/) based server.

## Prerequisites
```bash
$ pip3 install graphql-core-next
$ pip3 install mako
```

## Example
```bash
$ python3 generator.py \
      --input api-schema.graphql \
      --output ./resources/
```

## Usage
```bash
$ python3 generator.py --help
usage: generator.py [-h] --input INPUT [--output OUTPUT] [--config CONFIG]

optional arguments:
  -h, --help       show this help message and exit
  --input INPUT    GraphQL API schema file
  --output OUTPUT  Output directory for resolver.js file
```
