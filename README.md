# woo.sh
Framework for generating an [Apollo GraphQL](https://www.apollographql.com/) based server,
backed by a configurable database.

# Try it out
The example is based on a simplified version of the Star Wars GrapQL schema and requires an running
instance of ArangoDB.
```bash
$ ./build.sh
$ cd bin/woosh-server/
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