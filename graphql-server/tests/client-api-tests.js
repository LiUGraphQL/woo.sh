/**
 * This class is meant as basic functionality tests to see that the basic api of works as intended,
 * that the basic concept of a schema is used correctly (required fields and edges),
 * and that the correct data is inserted and retrieved into and from the the db.
 * 
 * Required edge validation to be set to on.
 *
 * This does not currently test edge annotations as these are not part of the starwars test schema
 * (Should probably write a custom schema for these tests instead)
 * 
 */

const { InMemoryCache } = require('apollo-cache-inmemory')
const { ApolloClient } = require('apollo-client');
const { HttpLink } = require('apollo-link-http');
const { introspectSchema } = require('graphql-tools');
const gql = require('graphql-tag');
const fetch = require('node-fetch');

async function testCreate(client) {
    // Test creation in multiple steps including optional fields, inline objects and connected objects

    // Test creation, name and _creationDate returns
    // Create Planet 1
    let time1 = new Date();
    let createPlanet1 = `
        mutation {
            createPlanet(data:{
                name: "testCreatePlanet1"
            }) {
                id
                name
                _creationDate
            }
        }
    `;
    const mutationCreatePlanet1 = await client.mutate({ mutation: gql`${createPlanet1}` });
    if (mutationCreatePlanet1.errors) {
        console.error("Create 1 failed");
        console.error(mutationCreatePlanet1.errors);
        return false;
    }
    let time2 = new Date();
    let ID1 = mutationCreatePlanet1.data.createPlanet.id;
    let name1 = mutationCreatePlanet1.data.createPlanet.name;
    let _creationDate = new Date(mutationCreatePlanet1.data.createPlanet._creationDate);

    if (name1 != "testCreatePlanet1" || time1 > _creationDate || _creationDate > time2) {
        console.error("Create 1 did not return expected results");
        return false;
    }


    // Test optional field
    // Create Planet2
    let createPlanet2 = `
        mutation {
            createPlanet(data: {
                name: "testCreatePlanet2"
                climate: "testCreateClimate"
            }) {
                name
                climate
            }
        }
    `;
    const mutationCreatePlanet2 = await client.mutate({ mutation: gql`${createPlanet2}` });
    if (mutationCreatePlanet2.errors) {
        console.error("Create 2 failed");
        console.error(mutationCreatePlanet2.errors);
        return false;
    }

    let name2 = mutationCreatePlanet2.data.createPlanet.name;
    let climate2 = mutationCreatePlanet2.data.createPlanet.climate;

    if (name2 != "testCreatePlanet2" || climate2 != "testCreateClimate") {
        console.error("Create 2 did not return expected results");
        return false;
    }

    // Test nested creation
    // Create Species1
    let createSpecies1 = `
        mutation {
            createSpecies(data: {
                name: "testCreateSpecies1"
                origin: {create: {name: "testCreatePlanet3" }}
            }) {
                name
                origin { name }
            }
        }
    `;
    const mutationCreateSpecies1 = await client.mutate({ mutation: gql`${createSpecies1}` });
    if (mutationCreateSpecies1.errors) {
        console.error("Create 3 failed");
        console.error(mutationCreateSpecies1.errors);
        return false;
    }

    let name3 = mutationCreateSpecies1.data.createSpecies.name;
    let name4 = mutationCreateSpecies1.data.createSpecies.origin.name;

    if (name3 != "testCreateSpecies1" || name4 != "testCreatePlanet3") {
        console.error("Create 3 did not return expected results");
        return false;
    }

    // Test connected creation
    // Create Species2
    let createSpecies2 = `
        mutation {
            createSpecies(data: {
                name: "testCreateSpecies2"
                origin: {connect: "${ID1}" }
            }) {
                origin { name }
            }
        }
    `;
    const mutationCreateSpecies2 = await client.mutate({ mutation: gql`${createSpecies2}` });
    if (mutationCreateSpecies2.errors) {
        console.error("Create 4 failed");
        console.error(mutationCreateSpecies2.errors);
        return false;
    }

    let name5 = mutationCreateSpecies2.data.createSpecies.origin.name;

    if (name5 != "testCreatePlanet1") {
        console.error("Create 4 did not return expected results");
        return false;
    }

    // Try to create Planet without required field
    // Create Planet 3
    let createPlanet3 = `
        mutation {
            createPlanet(data:{
                climate: "testCreateClimate2"
            }) {
                id
            }
        }
    `;
    try {
        const mutationCreatePlanet3 = await client.mutate({ mutation: gql`${createPlanet3}` });
        console.error("Managed to create planet without required field!");
        return false;
    } catch (e) {
        // Nothing, should throw error
    }

    // Try to create two objects in one mutation
    let createMulti1 = `
        mutation {
            createPlanet(data:{
                name: "testCreatePlanet4"
            }) {
                name
            }
            createSpecies(data:{
                name: "testCreateSpecies3"
            }) {
                name
            }
        }
    `;

    const mutationMulti1 = await client.mutate({ mutation: gql`${createMulti1}` });
    if (mutationMulti1.errors) {
        console.error("Create Multi 1 failed");
        console.error(mutationMulti1.errors);
        return false;
    }
    let name6 = mutationMulti1.data.createPlanet.name;
    let name7 = mutationMulti1.data.createSpecies.name;

    if (name6 != "testCreatePlanet4" || name7 != "testCreateSpecies3") {
        console.error("Create Multi 1 did not return expected results");
        return false;
    }
    return true;
}

async function testUpdate(client) {
    // Tests to try and update different fields of an object

    // Create object to update
    let createPlanet1 = `
        mutation {
            createPlanet(data: {
                name: "testUpdatePlanet1"
            }) {
                id
            }
        }
    `;
    const mutationCreatePlanet1 = await client.mutate({ mutation: gql`${createPlanet1}` });
    if (mutationCreatePlanet1.errors) {
        console.error("Create for Update failed");
        console.error(mutationCreatePlanet1.errors);
        return false;
    }

    let id1 = mutationCreatePlanet1.data.createPlanet.id

    // Test update of required (key) field and optional field

    let time1 = new Date();
    let update1 = `
        mutation {
            updatePlanet(id: "${id1}", data: {
                name: "testUpdatePlanet2"
                climate: "testUpdateClimate1"
            }) {
                name
                climate
                _lastUpdateDate
            }
        }
    `;

    const mutationUpdate1 = await client.mutate({ mutation: gql`${update1}` });
    if (mutationUpdate1.errors) {
        console.error("Update 1 failed");
        console.error(mutationUpdate1.errors);
        return false;
    }

    let name1 = mutationUpdate1.data.updatePlanet.name;
    let climate1 = mutationUpdate1.data.updatePlanet.climate;
    let lastUpdateDate = new Date(mutationUpdate1.data.updatePlanet._lastUpdateDate);
    let time2 = new Date();

    if (name1 != "testUpdatePlanet2" || climate1 != "testUpdateClimate1" || time1 > lastUpdateDate || lastUpdateDate > time2) {
        console.error("Update 1 did not return expected results");
        return false;
    }

    // Test update to set required field to 'null'
    let update2 = `
        mutation {
            updatePlanet(id: "${id1}", data: {
                name: null
            }) {
                name
            }
        }
    `;

    try {
        const mutationUpdate2 = await client.mutate({ mutation: gql`${update2}` });
        console.error("Update 2 managed to set a required field to null!");
        return false;
    } catch (e) {
        // Should throw and error
    }

    return true;
}

async function testCreateEdge(client) {
    // Tests to try and create edges, including duplicates

    // Create obects to connect
    let create1 = `
        mutation {
            createPlanet(data:{
                name: "testCreateEdgePlanet1"
            }) {
                id
            }
            createSpecies(data:{
                name: "testCreateEdgeSpecies1"
            }) {
                id
            }
        }
    `;

    const mutationCreate1 = await client.mutate({ mutation: gql`${create1}` });
    if (mutationCreate1.errors) {
        console.error("Create 1 for edge create failed");
        console.error(mutationCreate1.errors);
        return false;
    }

    let idSource = mutationCreate1.data.createSpecies.id;
    let idTarget = mutationCreate1.data.createPlanet.id;

    // Create Edge
    let createEdge1 = `
        mutation {
            createOriginEdgeFromSpecies(data:{
                sourceID: "${idSource}"
                targetID: "${idTarget}"
            }) {
                source { id }
                target { id }
            }
        }
    `;

    const mutationCreateEdge1 = await client.mutate({ mutation: gql`${createEdge1}` });
    if (mutationCreateEdge1.errors) {
        console.error("Create edge 1 failed");
        console.error(mutationCreateEdge1.errors);
        return false;
    }

    let idSource2 = mutationCreateEdge1.data.createOriginEdgeFromSpecies.source.id;
    let idTarget2 = mutationCreateEdge1.data.createOriginEdgeFromSpecies.target.id;

    if (idSource != idSource2 || idTarget != idTarget2) {
        console.error("Create edge 1 did not yield expected results");
        return false;
    }

    // Try to create the same edge again
    try {
        const mutationCreateEdge2 = await client.mutate({ mutation: gql`${createEdge1}` });
        console.error("Managed to create a duplicate edge for a single edge field");
        return false;
    } catch (e) {
        // Should give an error
    }

    return true;
}

async function testGet(client) {
    // Test to see that corrects results are returned when querying 
    // Including object fiels etc.

    // Create Planet 1
    let createGet1 = `
        mutation {
            createSpecies(data: {
                name: "testGetSpecies1"
                origin: {create: {name: "testGetPlanet1" }}
            }) {
                id
                origin { id }
            }
        }
    `;
    const mutationGetCreate = await client.mutate({ mutation: gql`${createGet1}` });
    if (mutationGetCreate.errors) {
        console.error("Create for Get failed");
        console.error(mutationGetCreat.errors);
        return false;
    }

    let speciesID = mutationGetCreate.data.createSpecies.id;
    let planetID = mutationGetCreate.data.createSpecies.origin.id;


    // Simple Get 
    let get1 = `
        query {
            species(id: "${speciesID}"){
                id
                name
            }
        }
    `;

    const q1 = await client.query({ query: gql`${get1}` });

    if (q1.errors) {
        console.error("Get 1 failed");
        console.error(q1.errors);
        return false;
    }

    let id1 = q1.data.species.id;
    let name1 = q1.data.species.name;

    if (id1 != speciesID || name1 != "testGetSpecies1") {
        console.error("Get query 1 did not return expected result");
        return false;
    }

    // Get with bad id
    let get2 = `
        query {
            species(id: "${planetID}"){
                id
            }
        }
    `;

    const q2 = await client.query({ query: gql`${get2}` });

    if (q2.errors) {
        console.error("Get 2 failed");
        console.error(q2.errors);
        return false;
    }

    if (q2.data.species != null) {
        console.error("Get query 2 did not return expected result");
        return false;
    }

    // Nested Get 
    let get3 = `
        query {
            species(id: "${speciesID}"){
                origin { id }
            }
        }
    `;

    const q3 = await client.query({ query: gql`${get3}` });

    if (q3.errors) {
        console.error("Get 3 failed");
        console.error(q3.errors);
        return false;
    }

    let id2 = q3.data.species.origin.id;

    if (id2 != planetID) {
        console.error("Get query 3 did not return expected result");
        return false;
    }

    // Nested Get Reverse
    let get4 = `
        query {
            planet(id: "${planetID}"){
                _originFromSpecies { id }
            }
        }
    `;

    const q4 = await client.query({ query: gql`${get4}` });

    if (q4.errors) {
        console.error("Ge4 3 failed");
        console.error(q4.errors);
        return false;
    }

    let id3 = q4.data.planet._originFromSpecies[0].id;

    if (id3 != speciesID) {
        console.error("Get query 4 did not return expected result");
        return false;
    }

    return true;
}

async function testGetEdge(client) {
    // Try To get edge and edge data

    // Create
    // The edge id returns here should maybe hade been part of another test
    let createGetEdge1 = `
        mutation {
            createSpecies(data: {
                name: "testGetEdgeSpecies1"
                origin: {create: {name: "testGetEdgePlanet1" }}
            }) {
                id
                origin { 
                    id
                    _incomingOriginEdgeFromSpecies { id }
                }
                _outgoingOriginEdgesFromSpecies { id }
            }
        }
    `;
    const mutationGetEdgeCreate = await client.mutate({ mutation: gql`${createGetEdge1}` });
    if (mutationGetEdgeCreate.errors) {
        console.error("Create for GetEdge failed");
        console.error(mutationGetEdgeCreate.errors);
        return false;
    }

    let speciesID = mutationGetEdgeCreate.data.createSpecies.id;
    let planetID = mutationGetEdgeCreate.data.createSpecies.origin.id;
    let ID = mutationGetEdgeCreate.data.createSpecies._outgoingOriginEdgesFromSpecies.id;
    let ID2 = mutationGetEdgeCreate.data.createSpecies.origin._incomingOriginEdgeFromSpecies[0].id;


    if (ID != ID2) {
        console.error("Incoming ID and Outgoing ID for same edge differs?!");
        return false;
    }

    // Get edge
    let get1 = `
        query {
            _OriginEdgeFromSpecies(id: "${ID}"){
                source { id }
                target { id }
            }
        }
    `;

    const q1 = await client.query({ query: gql`${get1}` });

    if (q1.errors) {
        console.error("GetEdge 1 failed");
        console.error(q1.errors);
        return false;
    }

    let source = q1.data._OriginEdgeFromSpecies.source.id;
    let target = q1.data._OriginEdgeFromSpecies.target.id;

    if (source != speciesID || target != planetID) {
        console.error("GetEde query 1 did not return expected result");
        return false;
    }

    // Get with bad id
    let get2 = `
        query {
            _OriginEdgeFromSpecies(id: "asdfghj"){
                source { id }
                target { id }
            }
        }
    `;

    const q2 = await client.query({ query: gql`${get2}` });

    if (q2.errors) {
        console.error("Get 2 failed");
        console.error(q2.errors);
        return false;
    }

    if (q2.data._OriginEdgeFromSpecies != null) {
        console.error("Get query 2 did not return expected result");
        return false;
    }

    return true;
}

async function testDelete(client) {
    // Test to delete objects

    // Create
    let createDelete1 = `
        mutation {
            createSpecies(data: {
                name: "testDeleteSpecies1"
                origin: {create: {name: "testDeletePlanet1" }}
            }) {
                id
                origin { 
                    id
                }
                _outgoingOriginEdgesFromSpecies { id }
            }
        }
    `;

    const mutationDeleteCreate = await client.mutate({ mutation: gql`${createDelete1}` });
    if (mutationDeleteCreate.errors) {
        console.error("Create for Delete failed");
        console.error(mutationDeleteCreat.errors);
        return false;
    }

    let speciesID = mutationDeleteCreate.data.createSpecies.id;
    let planetID = mutationDeleteCreate.data.createSpecies.origin.id;
    let edgeID = mutationDeleteCreate.data.createSpecies._outgoingOriginEdgesFromSpecies.id;

    // Simple delete
    let delete1 = `
        mutation {
            deleteSpecies(id: "${speciesID}"){
                id
                name
            }
        }
    `;

    const mutationDelete1 = await client.mutate({ mutation: gql`${delete1}` });
    if (mutationDelete1.errors) {
        console.error("Delete 1 failed");
        console.error(mutationDelete1.errors);
        return false;
    }

    let id1 = mutationDelete1.data.deleteSpecies.id;
    let name1 = mutationDelete1.data.deleteSpecies.name;

    if (id1 != speciesID || name1 != "testDeleteSpecies1") {
        console.error("Delete 1 did not return expected result");
        return false;
    }

    // Bad id delete
    let delete2 = `
        mutation {
            deleteSpecies(id: "asdfghjkl"){
                id
                name
            }
        }
    `;

    const mutationDelete2 = await client.mutate({ mutation: gql`${delete2}` });
    if (mutationDelete2.errors) {
        console.error("Delete 2 failed");
        console.error(mutationDelete2.errors);
        return false;
    }

    if (mutationDelete2.data.deleteSpecies != null) {
        console.error("Delete 2 did not return expected result");
        return false;
    }

    // Get
    let get = `
        query {
            _OriginEdgeFromSpecies(id: "${edgeID}"){
                id
            }
            species(id: "${speciesID}"){
                id
            }
            planet(id: "${planetID}"){
                id
                _incomingOriginEdgeFromSpecies { id }
            }
        }
    `;

    const q1 = await client.query({ query: gql`${get}` });

    if (q1.errors) {
        console.error("GetEdge 1 failed");
        console.error(q1.errors);
        return false;
    }

    let species = q1.data.species;
    let edge = q1.data._OriginEdgeFromSpecies;
    let incomingEdges = q1.data.planet._incomingOriginEdgeFromSpecies;

    if (species != null || edge != null || incomingEdges.lenght > 0) {
        console.error("Delete did not have expected result");
        return false;
    }

    return true;
}

async function testDeleteEdge(client) {
    // Test to delete edges

    // Create
    let createDeleteEdge1 = `
        mutation {
            createSpecies(data: {
                name: "testDeleteEdgeSpecies1"
                origin: {create: {name: "testDeleteEdgePlanet1" }}
            }) {
                id
                origin { 
                    id
                }
                _outgoingOriginEdgesFromSpecies { id }
            }
        }
    `;

    const mutationDeleteEdgeCreate = await client.mutate({ mutation: gql`${createDeleteEdge1}` });
    if (mutationDeleteEdgeCreate.errors) {
        console.error("Create for DeleteEdge failed");
        console.error(mutationDeleteEdgeCreate.errors);
        return false;
    }

    let speciesID = mutationDeleteEdgeCreate.data.createSpecies.id;
    let planetID = mutationDeleteEdgeCreate.data.createSpecies.origin.id;
    let edgeID = mutationDeleteEdgeCreate.data.createSpecies._outgoingOriginEdgesFromSpecies.id;

    // Delete Edge
    let delete1 = `
        mutation {
            deleteOriginEdgeFromSpecies(id: "${edgeID}"){
                id
                source { id }
            }
        }
    `;

    const mutationDelete1 = await client.mutate({ mutation: gql`${delete1}` });
    if (mutationDelete1.errors) {
        console.error("Edge Delete 1 failed");
        console.error(mutationDelete1.errors);
        return false;
    }

    let id1 = mutationDelete1.data.deleteOriginEdgeFromSpecies.id;
    let id2 = mutationDelete1.data.deleteOriginEdgeFromSpecies.source.id;

    if (id1 != edgeID || id2 != speciesID) {
        console.error("Edge Delete 1 did not return expected result");
        return false;
    }

    // Make sure edge is properly deleted
    let get1 = `
        query {
            species(id: "${speciesID}"){
                origin { id }
            }
            planet(id: "${planetID}"){
                _originFromSpecies { id }
            }
        }
    `;

    const q1 = await client.query({ query: gql`${get1}` });

    if (q1.errors) {
        console.error("Delete edge get failed");
        console.error(q1.errors);
        return false;
    }

    let origin = q1.data.species.origin;
    let reverseOrigin = q1.data.planet._originFromSpecies;
    if (origin != null || !(reverseOrigin[0] === undefined || reverseOrigin == null)) {
        console.error("Delete edge get query did not return expected result");
        return false;
    }

    // Try to delete same edge again

    const mutationDelete2 = await client.mutate({ mutation: gql`${delete1}` });
    if (mutationDelete2.errors) {
        console.error("Edge Delete 2 failed");
        console.error(mutationDelete2.errors);
        return false;
    }

    let deleteEdgeRes2 = mutationDelete2.data.deleteOriginEdgeFromSpecies;

    if (deleteEdgeRes2 != null) {
        console.error("Edge Delete 2 did not return expected result");
        return false;
    }

    return true;
}

async function testGetList(client) {
    // Test to query lists

    // Create
    let create = `
        mutation {
            c1: createSpecies(data: {
                name: "testGetListSpecies1"
                lifespan: 1000
            }) {
                id
            }
            c2: createSpecies(data: {
                name: "testGetListSpecies2"
                lifespan: 1000
            }) {
                id
            }
            c3: createSpecies(data: {
                name: "testGetListSpecies3"
                lifespan: 1002
            }) {
                id
            }
            c4: createSpecies(data: {
                name: "testGetListSpecies4"
                lifespan: 1003
            }) {
                id
            }
        }
    `;

    const mutationCreate = await client.mutate({ mutation: gql`${create}` });
    if (mutationCreate.errors) {
        console.error("Create for Get List failed");
        console.error(mutationCreat.errors);
        return false;
    }

    let id3 = mutationCreate.data.c3.id;
    let id4 = mutationCreate.data.c4.id;

    // Get List
    let getList1 = `
        query {
            listOfSpeciess {
                totalCount
            }
        }
    `;

    const q1 = await client.query({ query: gql`${getList1}` });

    if (q1.errors) {
        console.error("Get List 1 failed");
        console.error(q1.errors);
        return false;
    }

    let totalCount1 = q1.data.listOfSpeciess.totalCount;

    if (totalCount1 < 4) {
        console.error("Get List 1 did not return expected results!");
        return false;
    }

    // Get List with filter
    let getList2 = `
        query {
            listOfSpeciess(first: 10, after: "", filter: {lifespan: {_gt: 1000}}) {
                totalCount
                content { id }
            }
        }
    `;

    const q2 = await client.query({ query: gql`${getList2}` });

    if (q2.errors) {
        console.error("Get List 2 failed");
        console.error(q2.errors);
        return false;
    }

    let totalCount2 = q2.data.listOfSpeciess.totalCount;

    if (totalCount2 != 2) {
        console.error("Get List 2 did not return expected number of results!");
        return false;
    }

    let returnID1 = q2.data.listOfSpeciess.content[0].id;
    let returnID2 = q2.data.listOfSpeciess.content[1].id;

    if (!(returnID1 == id3 || returnID1 == id4) || !(returnID2 == id3 || returnID2 == id4)) {
        console.error("Get List 2 returned unexpected results!");
        return false;
    }

    // Get List with filter (for empty)
    let getList3 = `
        query {
            listOfSpeciess(first: 10, after: "", filter: {lifespan: {_gt: 10000}}) {
                totalCount
                content { id }
            }
        }
    `;

    const q3 = await client.query({ query: gql`${getList3}` });

    if (q3.errors) {
        console.error("Get List 2 failed");
        console.error(q3.errors);
        return false;
    }


    let totalCount3 = q3.data.listOfSpeciess.totalCount;

    if (totalCount3 != 0) {
        console.error("Get List 3 did not return expected number of results!");
        return false;
    }

    return true;
}

async function run() {
    // connect client to server
    let uri = 'http://localhost:4000';
    let { client, schema } = await connect(uri);

    if (!(await testCreate(client))) {
        console.error("Tests for Create failed!");
        throw "Test failed";
    }
    console.log("testCreate passed");

    if (!(await testUpdate(client))) {
        console.error("Tests for Update failed!");
        throw "Test failed";
    }
    console.log("testUpdate passed");

    if (!(await testCreateEdge(client))) {
        console.error("Tests for CreateEdge failed!");
        throw "Test failed";
    }
    console.log("testCreateEdge passed");

    if (!(await testGet(client))) {
        console.error("Tests for Query Get failed!");
        throw "Test failed";
    }
    console.log("testGet passed");

    if (!(await testGetEdge(client))) {
        console.error("Tests for Query Get Edge failed!");
        throw "Test failed";
    }
    console.log("testGetEdge passed");

    if (!(await testDelete(client))) {
        console.error("Tests for Delete failed!");
        throw "Test failed";
    }
    console.log("testDelete passed");

    if (!(await testDeleteEdge(client))) {
        console.error("Tests for DeleteEdge failed!");
        throw "Test failed";
    }
    console.log("testDeleteEdge passed");

    if (!(await testGetList(client))) {
        console.error("Tests for Delete failed!");
        throw "Test failed";
    }
    console.log("testGetList passed");
}

async function connect(uri) {
    const httpLink = new HttpLink({ uri: uri, fetch });
    const client = new ApolloClient({ link: httpLink, cache: new InMemoryCache() });
    const schema = await introspectSchema(httpLink); // parse remote schema
    return { client: client, schema: schema };
}

run().then(() => {
    console.log("API tests passed.");
    let exitAfterClientTests = process.env.EXIT_AFTER_CLIENT_TESTS === 'true';
    if (exitAfterClientTests) process.exit(0);
}).catch(reason => {
    let exitAfterClientTests = process.env.EXIT_AFTER_CLIENT_TESTS === 'true';
    // Not the nicest way to exit, but it works for testing.
    console.error(reason);
    console.error("API tests did NOT pass.");
    if (exitAfterClientTests) process.exit(1);
});
