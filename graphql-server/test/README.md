# List of tests

## type
- create type
- query type by ID
- query type by key
- create type with duplicate key
- update type
- delete type
- query list of type
- query list of type with paging
- query list of type with string filter

## type with edge
- create type with edge
- query type with edge by ID
- query type with edge by key
- create type with edge with duplicate key
- create type with edge connect
- create type with illegal edge connect
- query type with filtered edge
- query type with reverse edge

## type with interface edge
- create type with interface edge
- query type with interface edge by ID
- query type with interface edge by key
- create type with interface edge with duplicate key
- create type with interface edge connect
- create type with illegal interface edge connect
- query type with filtered interface edge
- query type with reverse interface edge

## interface
- query interface by ID
- query list of interface
- query list of interface with paging
- query list of interface with string filter

## type with union edge
- create type with union edge
- query type with union edge by ID
- create type with union edge with duplicate key
- create type with union edge connect
- create type with illegal union edge connect
- query type with reverse union edge

## edge
- create edge between types
- query edge by ID
- create annotated edge between types
- create edge between illegal types
- create edge between type and interface
- create edge between type and illegal interface
- create annotated edge between type and interface
- create edge between type and union
- create edge between type and illegal union
- create annotated edge between type and union
- update edge annotation
- delete edge

## export variables
- export scalar to create
- export scalar list to create
- export ID to connect type
- export ID connect interface
- export ID connect union
- export to create edge
- illegal export ID to connect
- export to update
- export to update edge

## directives (tests to be implemented)