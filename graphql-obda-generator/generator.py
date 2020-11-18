#!/usr/bin/env python3
import argparse
import os
from rdflib import Graph, RDF, RDFS, OWL, URIRef
import re
import json
from mako.template import Template

def run(ontology: str):
    g = Graph()
    g.parse(ontology, format="ttl")

    # Get mapping structure
    qres = g.query("""
        PREFIX woosh: <https://github.com/LiUGraphQL/woo.sh/>
        SELECT DISTINCT ?class ?mapping
        WHERE {
            ?class a owl:Class .
            ?class ^rdfs:subClassOf*/woosh:mapping ?mapping .
        }""")

    # Create and parse mapping representation
    classes = {}
    for row in qres:
        _class = re.split("[#/]", str(row.get("class")))[-1]
        mapping = json.loads(row.get("mapping"))
        classes[_class] = classes.get(_class, { "mappings" : [] })
        classes[_class]["mappings"].append(mapping)

    collect_types(classes)

    # Get union types and generate schema
    schema_string = render_schema(classes)
    with open("output/obda-schema.graphql", "w") as f:
        f.write(schema_string)

    # Generate resolvers
    resolvers_string = render_resolvers(classes)
    with open("output/obda-resolvers.js", "w") as f:
        f.write(resolvers_string)


def collect_types(classes):
    union_types = {}
    for name, value in classes.items():
        # Collect types
        types = []
        for mapping in value["mappings"]:
            for m in mapping["mapping"]:
                types.append(m["type"])

        # A union type cannot be used to define itself
        if len(types) > 1 and name in types:
            raise Exception(f"A union type cannot be used to define itself: {name} = {types}")

        value["types"] = types
    
    return union_types

def render_resolvers(union_types):
    template = Template(filename='resources/resolver.template')
    return template.render(data=union_types)

def render_schema(union_types):
    template = Template(filename='resources/schema.template')
    return template.render(data=union_types)

def pprint(obj):
    print(json.dumps(obj, sort_keys=True, indent=2))


run("resources/entity-types.ttl")
