# graphql-obda-generator
Generate a GraphQL API schema and resolver functions to support ontology based data access (OBDA) as part of the
woo.sh pipeline

## Prerequisites
```bash
$ pip3 install graphql-core
```

## Example
```bash
$ python3 generator.py \
      --ontology my-ontology.owl \
      --mapping my-ontology-to-r2rml-mapping-file.r2rml \
      --output my-output-direcory/
```

## Usage
```bash
$ python3 generator.py --help
usage: generator.py [-h] --ontology ONTOLOGY --mapping MAPPING --output OUTPUT

optional arguments:
  -h, --help           show this help message and exit

required arguments:
  --ontology ONTOLOGY  Path to an OWL ontology file
  --mapping MAPPING    Path to an R2RML mapping file
  --output OUTPUT      Path to an output directory
```