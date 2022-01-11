# graphql-server
This tool is the basis for automatically setting up a GraphQL server with a configurable
database backend. The GraphQL server is based on [Apollo GraphQL](https://www.apollographql.com/) while the
backend depends on a specific `driver`. The functionality of drivers and backends may differ with respect to,
e.g., transaction and concurrency support. For details, refer to the documentation provided for each
driver.

## Run configuration
The generated server uses the `dotenv` module to load environment variables from the a file in the run directory. The file should be named `.env` and is not to be pushed to git since it may contain sensitive information.

The server can be configured at runtime by setting the following variables in the `.env` file:

- `API_SCHEMA`: Path to GraphQL API schema (default: `resources/api-schema.graphql`) 
- `CUSTOM_API_SCHEMA`: Path to custom GraphQL API schema (default: `resources/custom-api-schema.graphql`)
- `RESOLVERS`: Path to resolvers (default: `resources/resolvers.js`)
- `CUSTOM_RESOLVERS`: Path to custom resolvers (default: `resources/custom-resolvers.js`)
- `DRIVER`: Specifies the database driver (default: `arangodb`)
- `DB_NAME`: Specifies the name of the database (default: `dev-db`)
- `DB_URL`: Specifies the URL to the database (default: `http://localhost:8529`)
- `DROP`: Indicates if the data in the database should be purged (default: `false`)
- `DISABLE_DIRECTIVES_CHECKING`: Enable or disable directive checking (default: `false`)
- `DISABLE_EDGE_VALIDATION`: Disable or enable edge validation (default: `false`)
- `DEBUG`: Enable debugging output (default: `false`)
- `USERNAME`: Username for authentication against the database (default: `undefined`)
- `PASSWORD`: Password for authentication against the database (default: `undefined`)

If you are running `woosh` in a docker container you can also specifiy the variables as environment variables.

## Available drivers
- ArangoDB


## Prerequisites
- npm (Node)
- Database backend

## Example
An example server based on a simplified version of the Star Wars GraphQL schema backed by [ArangoDB](https://www.arangodb.com/) has already been generated for testing purposes using the build script in the root directory:
```bash
$ ./woo.sh --input example/db-schema/starwars-db.graphql \
          --output example-server/ \
          --config  example/config.yml \
          --driver arangodb \
          --custom-api-schema example/custom-api-schema.graphql \
          --custom-resolvers example/custom-resolvers.js
```

To run the example server, simply navigate to `example-server/`, install the necessary dependencies using `npm install` and finally run:
```bash
$ npm start
```
The server will wait for `arangodb` to become available at `http://localhost:8529`. If your backend is password protected, you need to provide the necessary authentication information in the `.env` file (see above). Visit `http://localhost:4000` to try out the server.


# Running tests
In order to successfully run all `graphql-server` tests in a single run two instances of ArangoDB are needed. The first instance should not use any authentication and be exposed on the default port `8529`. The second instance should use authentication with the password `wooosh1234` for the `root` user and be exposed on port `8530`. This is most easily acomplished using docker:

```bash
# Terminal 1
$ docker run --rm -p 8529:8529 -e ARANGO_NO_AUTH=1 arangodb

# Terminal 2
$ docker run --rm -p 8530:8529 -e ARANGO_ROOT_PASSWORD=woosh1234 arangodb
```

Then run:
```bash
npm test
```
 
