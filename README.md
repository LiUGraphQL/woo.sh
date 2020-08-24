# woo.sh
woo.sh is a software framework that can automatically generate all necessary components to set up a full GraphQL server that creates and stores a graph database within a separate database management system (DBMS) and that provides a feature-rich GraphQL API to access this database. The only input that is needed for this process is the schema of the graph database that is to be created and used. Then, the main features of the generated GraphQL API are:
* creation and updates of the nodes in the graph database (including the properties of these nodes);
* creation and updates of the edges in the graph database (including the properties of these edges);
* automatic enforcement of integrity constraints that are part of the given database schema;
* mutation requests to execute multiple create/update operations with transactional guarantees (ACID);
* automatic addition of history metadata which can be accessed in queries (creation date, last update date);
* operations to query the database starting from a selected node that can be identifed based on its ID or based on key properties;
* operations to query the database starting from a list of nodes of the same type;
* queries on lists of nodes may apply filter conditions and paging;
* queries may retrieve properties of nodes, as well as properties of edges;
* queries may traverse any given edge in either direction.

For the definition of the graph database schema (which is the only input needed for woo.sh), we have developed an [approach that repurposes the GraphQL schema definition language as a language to define schemas for graph databases](https://blog.liu.se/olafhartig/documents/graphql-schemas-for-property-graphs/). As the DBMS used by a woo.sh-generated GraphQL server, woo.sh currently supports [ArangoDB](https://www.arangodb.com/). Support for other systems may be added in the future.

# Try it out
woo.sh comes with a simple example for demonstrating its use. The database schema of this example defines a simple graph database with data related to the Star Wars universe (as adapted from the [GraphQL learning material](https://graphql.org/learn/)). Using the demo requires a running instance of ArangoDB.
```bash
$ sh ./woo.sh --input example/db-schema/ \
              --output ./generated-example-server \
              --config example/config.yml \
              --driver arangodb \
              --custom-api-schema example/custom-api-schema.graphql \
              --custom-resolvers example/custom-resolvers.js

$ npm server.js

Waiting for ArangoDB to become available at http://localhost:8529
ArangoDB is now available at http://localhost:8529
Database dev-db deleted: true
Database 'dev-db' created
Collection 'Droid' created
Collection 'Species' created
Collection 'Planet' created
Collection 'Human' created
Collection 'Starship' created
Edge collection 'FriendsEdgeFromDroid' created
Edge collection 'HomeWorldEdgeFromDroid' created
Edge collection 'SpeciesEdgeFromDroid' created
Edge collection 'OriginEdgeFromSpecies' created
Edge collection 'StarshipsEdgeFromHuman' created
Edge collection 'FriendsEdgeFromHuman' created
Edge collection 'HomeWorldEdgeFromHuman' created
Edge collection 'SpeciesEdgeFromHuman' created
GraphQL service ready at: http://localhost:4000/
```

# Tests

## API/driver functionality
Test for API and driver functionality can be found in `graphql-server/tests`.

To run them first Use the example above for the Star Wars schema, end then run `graphql-server\tests\client-api-tests`

## Directives/Constrains
Tests for directives checking can be found in `graphql-server/tests`.

To run them first run `directives-tests-generator.sh` to generate schema, resolver, driver and server as usual.
Then start `server.js` in `graphql-server\tests\generated-directives-tests-server` (make sure `DISABLE_DIRECTIVES_CHECKING` is not set to true), and finally run `directives-tests.js`
