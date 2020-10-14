# Run tests using:
```
npm test
```


  ## basic server tests
    ✓ server should start without exceptions
    ✓ helloWorld should return "Hello world!"
    ✓ helloWorld(isNull: true) should return "null"
    ✓ helloWorldList should return ["Hello world!", "Hello world!", "Hello world!"]
    ✓ helloWorld(isNull: true) should return "null"
    ✓ server should stop without exceptions

  ## type tests
    ✓ create type
    ✓ query type by id
    ✓ query type by key
    ✓ create type with duplicate key
    ✓ update type
    ✓ delete type
    ✓ query list of type
    ✓ query list of type with paging
    ✓ query list of type with string filter

  ## type with edge tests
    ✓ create type with edge
    ✓ query type with edge by ID
    ✓ query type with edge by key
    ✓ create type with edge with duplicate key
    ✓ create type with edge connect
    ✓ create type with illegal edge connect
    ✓ query type with filtered edge
    ✓ query type with reverse edge

  ## type with edge interface tests
    ✓ create type with interface edge
    ✓ query type with interface edge by ID
    ✓ query type with interface edge by key
    ✓ create type with interface edge with duplicate key
    ✓ create type with interface edge connect
    ✓ create type with illegal interface edge connect
    ✓ query type with filtered interface edge
    ✓ query type with reverse interface edge

  ## type with union edge tests
    ✓ create type with union edge
    ✓ query type with union edge by ID
    ✓ create type with union edge with duplicate key
    ✓ create type with union edge connect
    ✓ create type with illegal union edge connect
    ✓ query type with reverse union edge
    
  ## interface tests
    ✓ query interface by ID
    ✓ query list of interface
    ✓ query list of interface with paging
    ✓ query list of interface with string filter

  ## edge tests
    ✓ create edge between types
    ✓ query edge by id
    ✓ create annotated edge between types
    ✓ create edge between illegal types
    ✓ create edge between type and interface
    ✓ create edge between type and illegal interface
    ✓ create annotated edge between type and interface
    ✓ create edge between type and union
    ✓ create edge between type and illegal union
    ✓ create annotated edge between type and union
    ✓ update edge
    ✓ delete edge
    ✓ delete source of edge
    ✓ delete target of edge

  ## export variables tests
    ✓ export scalar to create
    ✓ export scalar list to create
    ✓ export ID to connect type
    ✓ export ID connect interface
    ✓ export ID connect union
    ✓ export to create edge
    ✓ illegal export ID to connect
    ✓ export to update
    ✓ export to update edge

  ## directives tests
    @distinct tests
      ✓ distinct connects
      ✓ non-distinct connects should fail
      ✓ add distinct edge
      ✓ add non-distinct edge should fail
    @noloops tests
      ✓ no loops connect
      ✓ no loops edge
      ✓ loops edge
      ✓ no loops connect list
      ✓ no loops edge list
      ✓ loops edge list
    @requiredForTarget tests
      ✓ create object and target
      ✓ create object and connectto target
      ✓ delete edge connecting to target
      ✓ delete all edges connecting to target
      ✓ delete source of edge connecting to target
      ✓ create only target
      ✓ create object and target using dependent mutations
    @uniqueForTarget tests
      ✓ create object and target
      ✓ create targets
      ✓ create object and connect to target
      ✓ connect two objects to same target
      ✓ create object with list create
      ✓ create object with list connect
      ✓ connect two objects to the same targets