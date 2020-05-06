# graphql-server
This tool is the basis for automatically setting up a GraphQL server, with a configurable
database backend. The GraphQL server is based on [Apollo GraphQL](https://www.apollographql.com/).
Each backend requires a specific `driver`. Different drivers may offer different support when it
comes to e.g. transaction and concurrency support. Refer to the documentation provided for each
driver.

## Drivers
- ArangoDB

## Prerequisites
- npm (Node)

## Example
Generate a `woosh-server` based on a simplified version of the Star Wars GraphQL schema, and
backed by [ArangoDB](https://www.arangodb.com/).
```bash
$ ./build.sh
```
