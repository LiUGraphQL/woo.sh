/**
 * This class is meant to test the fur directives/constraints @noloops, @distinct, @requiredForTarget and @uniqueForTarget.
 * As of currently is only test for creation of objects/edges.
 * Createions/Updates/Deletions are handled in exactly the same manner for transactions, so only testing creations *should* be fine.
 */

const { InMemoryCache } = require('apollo-cache-inmemory')
const { ApolloClient } = require('apollo-client');
const { HttpLink } = require('apollo-link-http');
const { introspectSchema } = require('graphql-tools');
const gql = require('graphql-tag');
const fetch = require('node-fetch');

async function testDistinct(client) {
    // Creates 4 distinct objects of which the third one should fail.
    // Then creates 2 new edges of which the first should fail.
    
    // Create Distinct 1
    let createDistinct1 = `
        mutation {
            createDistinctTest(data:{
                testDummyField: 0
            }) {
                id
            }
        }
    `;
    const mutationCreateDistinct1 = await client.mutate({ mutation: gql`${createDistinct1}` });
    if (mutationCreateDistinct1.errors) {
        console.error(mutationCreateDistinct1.errors);
        return false;
    }
    let distinct1Id = mutationCreateDistinct1.data[`createDistinctTest`].id;
    
    // Create Distinct 2
    let createDistinct2 = `
        mutation {
            createDistinctTest(data:{
                testDummyField: 1
            }) {
                id
            }
        }
    `;
    const mutationCreateDistinct2 = await client.mutate({ mutation: gql`${createDistinct2}` });
    if (mutationCreateDistinct2.errors) {
        console.error(mutationCreateDistinct2.errors);
        return false;
    }
    let distinct2Id = mutationCreateDistinct2.data[`createDistinctTest`].id;
    
    // Create Distinct 3
    let createDistinct3 = `
        mutation {
            createDistinctTest(data:{
                shouldBeDistinct: [
                    {connect: "${distinct1Id}"},
                    {connect: "${distinct1Id}"}
                ]
            }) {
                id
            }
        }
    `;

    try { 
        const mutationCreateDistinct3 = await client.mutate({ mutation: gql`${createDistinct3}` });
        console.error("Breaking a @distinct directive did not yield an error!");
        return false;
    }
    catch (e) {
        // Should actually throw an error
    }
    
    // Create Distinct 4
    let createDistinct4 = `
        mutation {
            createDistinctTest(data:{
                shouldBeDistinct: [
                    {connect: "${distinct1Id}"},
                    {connect: "${distinct2Id}"}
                ]
            }) {
                id
            }
        }
    `;
    const mutationCreateDistinct4 = await client.mutate({ mutation: gql`${createDistinct4}` });
    if (mutationCreateDistinct4.errors) {
        console.error(mutationCreateDistinct4.errors);
        return false;
    }
    let distinct4Id = mutationCreateDistinct4.data[`createDistinctTest`].id;
    
    // Create Distinct Edge 1
    let createEdge1 = `
        mutation {
            createShouldBeDistinctEdgeFromDistinctTest(data:{
                sourceID: "${distinct4Id}"
                targetID: "${distinct1Id}"
            }) {
                id
            }
        }
    `; 
    try {
        const mutationCreateEdge1 = await client.mutate({ mutation: gql`${createEdge1}` });
        console.error("Breaking a @distinct directive did not yield an error!");
        return false;
    }
    catch (e) {
        // Should actually throw an error
    }
    
    // Create Distinct Edge 2
    let createEdge2 = `
        mutation {
            createShouldBeDistinctEdgeFromDistinctTest(data:{
                sourceID: "${distinct1Id}"
                targetID: "${distinct2Id}"
            }) {
                id
            }
        }
    `;
    const mutationCreateEdge2 = await client.mutate({ mutation: gql`${createEdge2}` });
    if (mutationCreateEdge2.errors) {
        console.error(mutationCreateEdge2.errors);
        return false;
    }
    
    return true;
}

async function testNoloops(client) {
    // Create the two connected object.
    // Create two edges of which one the first is a loop and should fail
    
    // Create Noloops 1
    let createNoloops1 = `
        mutation {
            createNoloopsTest(data:{
                testDummyField: 0
            }) {
                id
            }
        }
    `;
    const mutationCreateNoloops1 = await client.mutate({ mutation: gql`${createNoloops1}` });
    if (mutationCreateNoloops1.errors) {
        console.error(mutationCreateNoloops1.errors);
        return false;
    }
    let noloops1Id = mutationCreateNoloops1.data[`createNoloopsTest`].id;

    // Create Noloops 2
    let createNoloops2 = `
        mutation {
            createNoloopsTest(data:{
                possibleLoop: {connect: "${noloops1Id}"}
            }) {
                id
            }
        }
    `;
    const mutationCreateNoloops2 = await client.mutate({ mutation: gql`${createNoloops2}` });
    if (mutationCreateNoloops2.errors) {
        console.error(mutationCreateNoloops2.errors);
        return false;
    }
    let noloops2Id = mutationCreateNoloops2.data[`createNoloopsTest`].id;
    
    // Create Loop edge
    let createLoop = `
        mutation {
            createPossibleLoopEdgeFromNoloopsTest(data:{
                sourceID: "${noloops1Id}"
                targetID: "${noloops1Id}"
            }) {
                id
            }
        }
    `;

    try {
        const mutationCreateLoop = await client.mutate({ mutation: gql`${createLoop}` });
        console.error("Breaking a @noloops directive did not yield an error!");
        return false;
    }
    catch (e) {
        // Should actually throw an error
    }

    // Create Not Loop edge
    let createNotLoop = `
        mutation {
            createPossibleLoopEdgeFromNoloopsTest(data:{
                sourceID: "${noloops1Id}"
                targetID: "${noloops2Id}"
            }) {
                id
            }
        }
    `;
    const mutationCreateNotLoop = await client.mutate({ mutation: gql`${createNotLoop}` });
    if (mutationCreateNotLoop.error) {
        console.error(mutationCreateNotLoop.errors);
        return false;
    }

    return true;
}

async function testRequiredForTargetTest(client) {
    // Create a Target (should fail), then a Target together with a Source
    // Queries the id of the edge, and tries to delete the edge followed by the object.
    // Both deletions should fail.
    // Lastly delete both objects in valid order
    
    // Create RequiredForTargetTarget 1
    let createRequiredForTargetTarget1 = `
        mutation {
            createRequiredForTargetTarget(data:{
                testDummyField: 0
            }) {
                id
            }
        }
    `;

    try {
        const mutationCreateRequiredForTargetTarget1 = await client.mutate({ mutation: gql`${createRequiredForTargetTarget1}` });
        console.error("Breaking a @requiredForTarget directive did not yield an error!");
        return false;
    }
    catch (e) {
        // Should actually throw an error
    }
    
    // Create 
    let create = `
        mutation {
            createRequiredForTargetTest(data:{
                target: {create: {testDummyField: 1}}
            }) {
                id
            }
        }
    `;
    const mutationCreate = await client.mutate({ mutation: gql`${create}` });
    if (mutationCreate.errors) {
        console.error(mutationCreate.errors);
        return false;
    }
    let noRequiredSourceId = mutationCreate.data[`createRequiredForTargetTest`].id;
    
    // Get edge id
    let getIds = `
        query {
            requiredForTargetTest(id: "${noRequiredSourceId}") {
                target { id }
                _outgoingTargetEdgesFromRequiredForTargetTest { id }
            }
        }`;
    
    const queryIds = await client.query({ query: gql`${getIds }` });

    if (queryIds.errors) {
        console.error(queryIds.errors);
    }

    let targetId = queryIds.data.requiredForTargetTest.target.id
    let edgeId = queryIds.data.requiredForTargetTest._outgoingTargetEdgesFromRequiredForTargetTest.id;
    
    // Delete Edge
    let deleteEdge = `
        mutation {
            deleteTargetEdgeFromRequiredForTargetTest(id: "${edgeId}"){
                id
            }
        }`;

    try {
        const mutationDeleteEdge = await client.mutate({ mutation: gql`${deleteEdge}` });
        console.error("Breaking a @requiredForTarget directive did not yield an error!");
        return false;
    }
    catch (e) {
        // Should actually throw an error
    }
    
    // Delete Object
    let deleteObject = `
        mutation {
            deleteRequiredForTargetTest(id: "${noRequiredSourceId}"){
                id
            }
        }`;

    try {
        const mutationDeleteObject = await client.mutate({ mutation: gql`${deleteObject}` });
        console.error("Breaking a @requiredForTarget directive did not yield an error!");
        return false;
    }
    catch (e) {
        // Should actually throw an error
    }
    
    // Delete Target
    let deleteTarget = `
        mutation {
            deleteRequiredForTargetTarget(id: "${targetId}"){
                id
            }
        }`;
    const mutationDeleteTarget = await client.mutate({ mutation: gql`${deleteTarget}` });
    if (mutationDeleteTarget.errors) {
        console.error(mutationDeleteTarget.errors);
        return false;
    }
    
    // Delete Target
    let deleteSource = `
        mutation {
            deleteRequiredForTargetTest(id: "${noRequiredSourceId}"){
                id
            }
        }`;
    const mutationDeleteSource = await client.mutate({ mutation: gql`${deleteSource}` });
    if (mutationDeleteSource.errors) {
        console.error(mutationDeleteSource.errors);
        return false;
    }
    
    return true;
}

async function testUniqueForTargetTest(client) {
    // 
    
    // Create UniqueForTargetTarget 
    let createUniqueForTargetTarget = `
        mutation {
            createUniqueForTargetTarget(data:{
                testDummyField: 0
            }) {
                id
            }
        }
    `;
    const mutationCreateUniqueForTargetTarget = await client.mutate({ mutation: gql`${createUniqueForTargetTarget}` });
    if (mutationCreateUniqueForTargetTarget.errors) {
        console.error(mutationCreateUniqueForTargetTarget.errors);
        return false;
    }
    let targetId = mutationCreateUniqueForTargetTarget.data[`createUniqueForTargetTarget`].id;

    // Create createUniqueForTargetTest 1
    let createUniqueForTargetTest1 = `
        mutation {
            createUniqueForTargetTest(data:{
                target: {connect: "${targetId}"}
            }) {
                id
            }
        }
    `;
    const mutationCreateUniqueForTargetTest1 = await client.mutate({ mutation: gql`${createUniqueForTargetTest1}` });
    if (mutationCreateUniqueForTargetTest1.errors) {
        console.error(mutationCreateUniqueForTargetTest1.errors);
        return false;
    }

    // Create createUniqueForTargetTest 2
    let createUniqueForTargetTest2 = `
        mutation {
            createUniqueForTargetTest(data:{
                target: {connect: "${targetId}"}
            }) {
                id
            }
        }
    `;

    try {
        const mutationCreateUniqueForTargetTest2 = await client.mutate({ mutation: gql`${createUniqueForTargetTest2}` });
        console.error("Breaking a @uniqueForTarget directive did not yield an error!");
        return false;
    }
    catch (e) {
        // Should actually throw an error
    }

    return true;
}

async function run() {
    // connect client to server
    let uri = 'http://localhost:4000';
    let {client, schema} = await connect(uri);

    if (!(await testDistinct(client) && await testNoloops(client) && await testRequiredForTargetTest(client) && await testUniqueForTargetTest(client))) {
        console.error("One or more test failed!");
        throw "Test failed";
    }
}

async function connect(uri){
    const httpLink = new HttpLink({ uri: uri, fetch });
    const client = new ApolloClient({ link: httpLink, cache: new InMemoryCache() });
    const schema = await introspectSchema(httpLink); // parse remote schema
    return { client: client, schema: schema };
}

run().then(() => {
    console.log("Directives test passed.");
    let exitAfterClientTests = process.env.EXIT_AFTER_CLIENT_TESTS === 'true';
    if(exitAfterClientTests) process.exit(0);
}).catch(reason => {
    let exitAfterClientTests = process.env.EXIT_AFTER_CLIENT_TESTS === 'true';
    // Not the nicest way to exit, but it works for testing.
    console.error(reason);
    console.error("Directives test did NOT pass.");
    if(exitAfterClientTests) process.exit(1);
});
