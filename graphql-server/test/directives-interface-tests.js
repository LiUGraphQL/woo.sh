const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const { makeServer } = require('../server');
const { request, gql } = require('graphql-request');
const { readFileSync } = require('fs');

// Schema before API generation
let baseSchema = readFileSync('./test/resources/directives-interface-tests-api.graphql', 'utf8'); // relative to root
let resolvers = require('./resources/directives-interface-tests-resolvers.js'); // relative to test file
const { isBuffer } = require('util');
const { concatAST } = require('graphql');
const { ServerResponse } = require('http');

let testServer;
let url;

describe('# directives interface tests', () => {
    before((done) => {
        let options = {
            baseSchema,
            resolvers,
            'driver': 'arangodb',
            'dbName': 'test-db',
            'dbUrl': 'http://localhost:8529',
            'drop': true,
            'disableDirectivesChecking': true,
            'disableEdgeValidation': false,
            'debug': false
        };

        console.info = function () {};
        makeServer(options).then(server => {
            server.listen(4001, done).then(server => {
                testServer = server;
                url = server.url;
            });
        });
    });

    describe('@distinct interface tests', () => {
        it('distinct connects #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createDistinctTest1(data:{}) { id @export(as:"id1")}
                m2:createDistinctTest2(data:{}) { id @export(as:"id2")}
                m3:createDistinctTest1(data:{ shouldBeDistinct: [ { connect: $id1 }, { connect: $id2 } ]}) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield error for when connecting two different objects implementing the same interface`);
                });
        });
        
        it('distinct connects #2', async () => {
            let mutation = `mutation {
                m1:createDistinctTest1(data:{}) { id }
                m2:createDistinctTest2(data:{}) { id }
            }`;
            let id1, id2;
            await request(url, mutation)
                .then((data) => {
                    id1 = data['m1']['id'];
                    id2 = data['m2']['id'];
                });
            let m = `mutation {
                createDistinctTest1(data:{
                    shouldBeDistinct: [ { connect: "${id1}" },{ connect: "${id2}" } ]}) { id }
                }`;
            await request(url, m)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield error for when connecting two different objects implementing the same interface`);
                });;
        });

        it('distinct non-distinct connects should fail #1', async () => {
            let mutation = `mutation($id:ID!) {
                m1:createDistinctTest1(data:{}) { id @export(as:"id")}
                m2:createDistinctTest2(data:{ shouldBeDistinct: [ { connect: $id }, { connect: $id } ]}) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@distinct directive should yield error when connecting two the same object twice`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq('Field shouldBeDistinct in DistinctTest2 is breaking a @distinct directive!');
                    return null;
                });
            if(err != null) throw err;
        });

        it('distinct non-distinct connects should fail #2', async () => {
            let mutation = `mutation { createDistinctTest1(data:{}) { id } }`;
            let id = await request(url, mutation).then((data) => data['createDistinctTest1']['id']);

            let m = `mutation {
                createDistinctTest2(data:{
                    shouldBeDistinct: [ { connect: "${id}" },{ connect: "${id}" } ]}) { id }
                }`;
            let err = await request(url, m)
                .then(() => new Error(`@distinct directive should yield error when connecting two the same object twice`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq('Field shouldBeDistinct in DistinctTest2 is breaking a @distinct directive!');
                    return null;
                });
            if(err != null) throw err;
        });

        it('distinct add distinct edge #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createDistinctTest1(data:{}) { id @export(as:"id1")}
                m2:createDistinctTest2(data:{}) { id @export(as:"id2")}
                m3:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: $id1 targetID: $id2 }) { id }
                m4:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: $id1 targetID: $id1 }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield an error when adding two edges to different objects`);
                });
        });

        it('distinct add distinct edge #2', async () => {
            let mutation = `mutation {
                m1:createDistinctTest1(data:{}) { id }
                m2:createDistinctTest2(data:{}) { id }
            }`;

            let id1, id2;
            await request(url, mutation)
                .then((data) => {
                    id1 = data['m1']['id'];
                    id2 = data['m2']['id'];
                });
            let m = `mutation {
                m1:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id }
                m2:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: "${id1}" targetID: "${id1}" }) { id }
            }`;
            await request(url, m)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield an error when adding two edges to different objects`);
                });
        });

        it('distinct add non-distinct edge should fail #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createDistinctTest1(data:{}) { id @export(as:"id1")}
                m2:createDistinctTest2(data:{}) { id @export(as:"id2")}
                m3:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: $id1 targetID: $id2 }) { id }
                m4:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: $id1 targetID: $id2 }) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@distinct directive should yield an error for when adding an edge to the same object twice`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq('Field shouldBeDistinct in DistinctTest1 is breaking a @distinct directive!');
                    return null;
                });
            if(err != null) throw err;
        });

        it('distinct add non-distinct edge should fail #2', async () => {
            let mutation = `mutation {
                m1:createDistinctTest1(data:{}) { id }
                m2:createDistinctTest2(data:{}) { id }
            }`;
            let id1, id2;
            await request(url, mutation)
                .then((data) => {
                    id1 = data['m1']['id'];
                    id2 = data['m2']['id'];
                });

            let m = `mutation {
                m1:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id }
                m2:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id }
            }`;

            let err = await request(url, m)
                .then(() => new Error(`@distinct directive should yield an error for when adding an edge to the same object twice`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq('Field shouldBeDistinct in DistinctTest1 is breaking a @distinct directive!');
                    return null;
                });
            if(err != null) throw err;
        });

        it('distinct delete non-distinct edge #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!, $edgeId: ID!) {
                m1:createDistinctTest1(data:{}) { id @export(as:"id1")}
                m2:createDistinctTest2(data:{}) { id @export(as:"id2")}
                m3:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: $id1 targetID: $id2 }) { id }
                m4:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: $id1 targetID: $id2 }) { id @export(as:"edgeId")}
                deleteShouldBeDistinctEdgeFromDistinctTest1(id: $edgeId) { id }
            }`;
            await request(url, mutation)
                .then(data => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield an error when non-distinct edge is deleted within the same mutation`);
                });
        });

        it('distinct delete non-distinct edge #2', async () => {
            let mutation = `mutation {
                m1:createDistinctTest1(data:{}) { id }
                m2:createDistinctTest2(data:{}) { id }
            }`;

            let id1, id2;
            await request(url, mutation)
                .then(data => {
                    id1 = data['m1']['id'];
                    id2 = data['m2']['id'];
                })
            
            let m = `mutation($edgeId: ID!) {
                m1:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id }
                m2:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id @export(as:"edgeId")}
                deleteShouldBeDistinctEdgeFromDistinctTest1(id: $edgeId) { id }
            }`;
            await request(url, m)
                .then(data => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield an error when non-distinct edge is deleted within the same mutation`);
                });
        });
        
        it('distinct delete non-distinct edge #3', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createDistinctTest1(data:{}) { id @export(as:"id1")}
                m2:createDistinctTest2(data:{}) { id @export(as:"id2")}
                m3:createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: $id1 targetID: $id2 }) { id }
            }`;

            let id1, id2, edgeId;
            await request(url, mutation)
                .then(data => {
                    id1 = data['m1']['id'];
                    id2 = data['m2']['id'];
                    edgeId = data['m3']['id'];
                })
            
            let m = `mutation {
                createShouldBeDistinctEdgeFromDistinctTest1(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id }
                deleteShouldBeDistinctEdgeFromDistinctTest1(id: "${edgeId}") { id }
            }`;
            await request(url, m)
                .then(data => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield an error when non-distinct edge is deleted within the same mutation`);
                });
        });
    });

    // TODO
    describe('@required interface tests', () => {
        it('required fields create', async () => {
            let mutation = `
            mutation {
                createRequiredTest(data:{
                    required: { create: {} }
                    requiredList: [{ create: {} }]
                }) { id }
            }`;

            let err = await request(url, mutation)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@required directive should not yield error for when creating required object(s)`);
                });
        });

        it('required field connect #1', async () => {
            let mutation = `
            mutation($id:ID!) {
                createRequiredField(data:{}) { id @export(as:"id")}
                createRequiredTest(data:{
                    required: { connect: $id }
                    requiredList: [{ create: {} }]
                }) { id }
            }`;

            await request(url, mutation)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@required directive should not yield error when connecting to required object(s)`);
                });
        });

        it('required field connect #2', async () => {
            let mutation = `
            mutation {
                createRequiredField(data:{}) { id }
            }`;

            await request(url, mutation)
                .then(data => { id = data['createRequiredField']['id']})

            let m = `
            mutation {
                createRequiredTest(data:{
                    required: { connect: "${id}" }
                    requiredList: [{ create: {} }]
                }) { id }
            }`;
            await request(url, m)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@required directive should not yield error when connecting to required object(s)`);
                });
        });

        it('required list field connect #1', async () => {
            let mutation = `
            mutation($id:ID!) {
                createRequiredField(data:{}) { id @export(as:"id")}
                createRequiredTest(data:{
                    required: { create: {} }
                    requiredList: [{ connect: $id }]
                }) { id }
            }`;

            await request(url, mutation)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@required directive should not yield error when connecting to required object(s)`);
                });
        });

        it('required list field connect #2', async () => {
            let mutation = `
            mutation {
                createRequiredField(data:{}) { id }
            }`;

            await request(url, mutation)
                .then(data => { id = data['createRequiredField']['id']})

            let m = `
            mutation {
                createRequiredTest(data:{
                    required: { create: {} }
                    requiredList: [{ connect: "${id}" }]
                }) { id }
            }`;
            await request(url, m)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@required directive should not yield error when connecting to required object(s)`);
                });
        });

        it('required missing should fail', async () => {
            let mutation = `
            mutation($id:ID!) {
                createRequiredField(data:{}) { id @export(as:"id")}
                createRequiredTest(data:{ requiredList: [{ connect: $id }] }){ id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@required directive should yield error when required object is not supplied`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field required in RequiredTest is breaking a @required directive!")
                });
            if(err != null) {
                throw err;
            }
        });

        it('required missing list should fail', async () => {
            let mutation = `
            mutation($id:ID!) {
                createRequiredField(data:{}) { id @export(as:"id")}
                createRequiredTest(data:{
                    required: { connect: $id }
                }) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@required directive should yield error when required list is not supplied`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field requiredList in RequiredTest is breaking a @required directive!");
                });
            if(err != null) throw err;
        });

        it('required add edge', async () => {
            let mutation = `
            mutation($requiredFieldId: ID!, $requiredTestId: ID!) {
                createRequiredField(data:{}) { id @export(as:"requiredFieldId") }
                createRequiredTest(data:{ requiredList: [{ create: {} }] }) { id @export(as:"requiredTestId") }
                createRequiredEdgeFromRequiredTest(data: { sourceID: $requiredTestId, targetID: $requiredFieldId }) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => null)
                .catch((err) => new Error(`@required directive should not yield an error when required field is supplied in dependent mutation`));
            if(err != null) throw err;
        });

        it('required add list edge', async () => {
            let mutation = `
            mutation($requiredFieldId: ID!, $requiredTestId: ID!) {
                createRequiredField(data:{}) { id @export(as:"requiredFieldId") }
                createRequiredTest(data:{ required: { create: {} } }) { id @export(as:"requiredTestId") }
                createRequiredListEdgeFromRequiredTest(data: { sourceID: $requiredTestId, targetID: $requiredFieldId }) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => null)
                .catch((err) => new Error(`@required directive should not yield an error when required field is supplied in dependent mutation`));
            if(err != null) throw err;
        });

        it('required delete field should fail #1', async () => {
            let mutation = `mutation($requiredFieldId: ID!) {
                createRequiredField(data:{}) { id @export(as:"requiredFieldId") }
                createRequiredTest(data:{
                    required: { connect: $requiredFieldId }
                    requiredList: [{ create: {} }]
                }) { id }
                deleteRequiredField(id: $requiredFieldId) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@required directive should yield error when required field is deleted`))
                .catch((err) =>  {
                    expect(err.response.errors[0].message).to.eq("Field required in RequiredTest is breaking a @required directive!");
                });
            if(err != null) throw err;
        });

        it('required delete field should fail #2', async () => {
            let mutation = `mutation {
                createRequiredTest(data:{
                    required: { create: {} }
                    requiredList: [{ create: {} }]
                }) {
                    required {
                        id
                    }
                }
            }`;

            let id = await request(url, mutation).then(data => data['createRequiredTest']['required']['id']);
            let m = `mutation { deleteRequiredField(id: "${id}") { id } }`;
            let err = await request(url, m)
                .then(() => new Error(`@required directive should yield error when required field is deleted`))
                .catch((err) =>  {
                    expect(err.response.errors[0].message).to.eq("Field required in RequiredTest is breaking a @required directive!");
                });
            if(err != null) throw err;
        });

        it('required delete list field should fail #1', async () => {
            let mutation = `mutation($requiredFieldId: ID!) {
                createRequiredField(data:{}) { id @export(as:"requiredFieldId") }
                createRequiredTest(data:{
                    requiredList: [{ connect: $requiredFieldId }]
                    required: { create: {} }
                }) { id }
                deleteRequiredField(id: $requiredFieldId) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@required directive should yield error when required list field is deleted`))
                .catch((err) =>  {
                    expect(err.response.errors[0].message).to.eq("Field requiredList in RequiredTest is breaking a @required directive!");
                });
            if(err != null) throw err;
        });

        it('required delete list field should fail #2', async () => {
            let mutation = `mutation {
                createRequiredTest(data:{
                    required: { create: {} }
                    requiredList: [{ create: {} }]
                }) {
                    requiredList {
                        id
                    }
                }
            }`;

            let id = await request(url, mutation).then(data => data['createRequiredTest']['requiredList'][0]['id']);
            let m = `mutation { deleteRequiredField(id: "${id}") { id } }`;
            let err = await request(url, m)
                .then(() => new Error(`@required directive should yield error when required list field is deleted`))
                .catch((err) =>  {
                    expect(err.response.errors[0].message).to.eq("Field requiredList in RequiredTest is breaking a @required directive!");
                });
            if(err != null) throw err;
        });

        it('required delete edge should fail #1', async () => {
            let mutation = `
            mutation($requiredFieldId: ID!, $requiredTestId: ID!, $edgeId: ID!) {
                createRequiredField(data:{}) { id @export(as:"requiredFieldId") }
                createRequiredTest(data:{ requiredList: [{ create: {} }] }) { id @export(as:"requiredTestId") }
                createRequiredEdgeFromRequiredTest(data: { sourceID: $requiredTestId, targetID: $requiredFieldId }) { id @export(as:"edgeId")}
                deleteRequiredEdgeFromRequiredTest(id: $edgeId) { id }
            }`;
        
            let err = await request(url, mutation)
                .then(() => new Error(`@required directive should yield an error when deleting a required field`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field required in RequiredTest is breaking a @required directive!");
                });
            if(err != null) throw err;
        });

        it('required delete edge should fail #2', async () => {
            let mutation = `
            mutation($requiredFieldId: ID!, $requiredTestId: ID!) {
                createRequiredField(data:{}) { id @export(as:"requiredFieldId") }
                createRequiredTest(data:{ requiredList: [{ create: {} }] }) { id @export(as:"requiredTestId") }
                createRequiredEdgeFromRequiredTest(data: { sourceID: $requiredTestId, targetID: $requiredFieldId }) { id }
            }`;

            let edgeId = await request(url, mutation).then(data => data['createRequiredEdgeFromRequiredTest']['id']);
            
            let m = `mutation { deleteRequiredEdgeFromRequiredTest(id: "${edgeId}"){ id } }`;
            let err = await request(url, m)
                .then(() => new Error(`@required directive should yield an error when deleting a required field`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field required in RequiredTest is breaking a @required directive!");
                });
            if(err != null) throw err;
        });

        it('required delete list edge should fail #1', async () => {
            let mutation = `
            mutation($requiredFieldId: ID!, $requiredTestId: ID!, $edgeId: ID!) {
                createRequiredField(data:{}) { id @export(as:"requiredFieldId") }
                createRequiredTest(data:{ required: { create: {} } }) { id @export(as:"requiredTestId") }
                createRequiredListEdgeFromRequiredTest(data: { sourceID: $requiredTestId, targetID: $requiredFieldId }) { id @export(as:"edgeId")}
                deleteRequiredListEdgeFromRequiredTest(id: $edgeId) { id }
            }`;
        
            let err = await request(url, mutation)
                .then(() => new Error(`@required directive should yield an error when deleting a required field`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field requiredList in RequiredTest is breaking a @required directive!");
                });
            if(err != null) throw err;
        });

        it('required delete list edge should fail #2', async () => {
            let mutation = `
            mutation($requiredFieldId: ID!, $requiredTestId: ID!) {
                createRequiredField(data:{}) { id @export(as:"requiredFieldId") }
                createRequiredTest(data:{ required: { create: {} } }) { id @export(as:"requiredTestId") }
                createRequiredListEdgeFromRequiredTest(data: { sourceID: $requiredTestId, targetID: $requiredFieldId }) { id }
            }`;
            let edgeId = await request(url, mutation).then(data => data['createRequiredListEdgeFromRequiredTest']['id']);

            let m = `mutation { deleteRequiredListEdgeFromRequiredTest(id: "${edgeId}"){ id } }`;
            let err = await request(url, m)
                .then(() => new Error(`@required directive should yield an error when deleting a required field`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field requiredList in RequiredTest is breaking a @required directive!");
                });
            if(err != null) throw err;
        });
    });

    // Doing
    describe('@noloops interface tests', () => {
        it('noloops field create', async () => {
            let mutation = `mutation {
                createNoloopsTest1(data:{ possibleLoop: { createNoloopsTest2: {} } }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err =>  {
                    console.log(err)
                    throw new Error(`@noloops directive should not yield error when creating new object`)
                });
        });

        it('noloops list field create', async () => {
            let mutation = `mutation {
                createNoloopsTest1(data:{ possibleLoops: [{ createNoloopsTest2: {} }] }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when creating new objects`)
                });
        });

        it('noloops field connect #1', async () => {
            let mutation = `mutation { createNoloopsTest1(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest1']['id']);
            let m = `mutation { createNoloopsTest2(data:{ possibleLoop: { connect: "${id}" } }) { id } }`;

            await request(url, m)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when connecting to new object`)
                });
        });

        it('noloops field connect #2', async () => {
            let mutation = `mutation($id: ID!) {
                m1:createNoloopsTest1(data: {}){ id @export(as:"id") }
                m2:createNoloopsTest2(data:{ possibleLoop: { connect: $id } }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when connecting to new object`)
                });
        });

        it('noloops list field connect #1', async () => {
            let mutation = `mutation { createNoloopsTest1(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest1']['id']);
            let m = `mutation { createNoloopsTest2(data:{ possibleLoops: [{ connect: "${id}" }] }) { id } }`;

            await request(url, m)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when connecting to new object`)
                });
        });

        it('noloops list field connect #2', async () => {
            let mutation = `mutation($id: ID!) {
                m1:createNoloopsTest1(data: {}){ id @export(as:"id") }
                m2:createNoloopsTest2(data:{ possibleLoops: [{ connect: $id }] }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when connecting to new objects`)
                });
        });

        it('noloops add edge #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createNoloopsTest1(data:{}){ id @export(as:"id1") }
                m2:createNoloopsTest2(data:{}){ id @export(as:"id2") }
                createPossibleLoopEdgeFromNoloopsTest1(data: {
                    sourceID: $id1
                    targetID: $id2
                }) { id }
            }`;
            await request(url, mutation)
                .then(data => null)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error adding edge between different objects`)
                });
        });


        it('noloops add edge #2', async () => {
            let mutation = `mutation {
                m1:createNoloopsTest1(data:{}){ id }
                m2:createNoloopsTest2(data:{}){ id }
            }`;
            let id1, id2;
            await request(url, mutation).then(data => {
                id1 = data['m1']['id'];
                id2 = data['m2']['id'];
            });
            let m = `mutation {
                createPossibleLoopEdgeFromNoloopsTest1(data: { sourceID: "${id1}", targetID: "${id2}" }) { id }
            }`;

            await request(url, m)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error adding edge between different objects`)
                });
        });

        it('noloops add list edge #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createNoloopsTest1(data:{}){ id @export(as:"id1") }
                m2:createNoloopsTest2(data:{}){ id @export(as:"id2") }
                createPossibleLoopsEdgeFromNoloopsTest1(data: {
                    sourceID: $id1
                    targetID: $id2
                }) { id }
            }`;
            await request(url, mutation)
                .then(data => null)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error adding edge between different objects`)
                });
        });


        it('noloops add list edge #2', async () => {
            let mutation = `mutation {
                m1:createNoloopsTest1(data:{}){ id }
                m2:createNoloopsTest2(data:{}){ id }
            }`;
            let id1, id2;
            await request(url, mutation).then(data => {
                id1 = data['m1']['id'];
                id2 = data['m2']['id'];
            });
            let m = `mutation {
                createPossibleLoopsEdgeFromNoloopsTest1(data: { sourceID: "${id1}", targetID: "${id2}" }) { id }
            }`;

            await request(url, m)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error adding edge between different objects`)
                });
        });

        it('noloops add edge loop should fail #1', async () => {
            let mutation = `mutation($id:ID!) {
                createNoloopsTest1(data:{}){ id @export(as:"id") }
                createPossibleLoopEdgeFromNoloopsTest1(data: {
                    sourceID: $id
                    targetID: $id
                }) { id }
            }`;
            await request(url, mutation)
            .then(data =>  new Error(`@noloops directive should yield error adding a loop edge`))
            .catch(err =>  {
                expect(err.response.errors[0].message).to.eq('Field possibleLoop in NoloopsTest1 is breaking a @noloops directive!');
            });
        });

        it('noloops add edge loop should fail #2', async () => {
            let mutation = `mutation { createNoloopsTest1(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest1']['id']);
            let m = `mutation {
                createPossibleLoopEdgeFromNoloopsTest1(data: {
                    sourceID: "${id}"
                    targetID: "${id}"
                }) { id }
            }`;

            await request(url, m)
            .then(data =>  new Error(`@noloops directive should yield error adding a loop edge`))
            .catch(err =>  {
                expect(err.response.errors[0].message).to.eq('Field possibleLoop in NoloopsTest1 is breaking a @noloops directive!');
            });
        });

        it('noloops add list edge loop should fail #1', async () => {
            let mutation = `mutation($id:ID!) {
                createNoloopsTest1(data:{}){ id @export(as:"id") }
                createPossibleLoopsEdgeFromNoloopsTest1(data: {
                    sourceID: $id
                    targetID: $id
                }) { id }
            }`;
            await request(url, mutation)
            .then(data =>  new Error(`@noloops directive should yield error adding a loop edge`))
            .catch(err =>  {
                expect(err.response.errors[0].message).to.eq('Field possibleLoops in NoloopsTest1 is breaking a @noloops directive!');
            });
        });

        it('noloops add list edge loop should fail #2', async () => {
            let mutation = `mutation { createNoloopsTest1(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest1']['id']);
            let m = `mutation {
                createPossibleLoopsEdgeFromNoloopsTest1(data: {
                    sourceID: "${id}"
                    targetID: "${id}"
                }) { id }
            }`;

            await request(url, m)
            .then(data =>  new Error(`@noloops directive should yield error adding a loop edge`))
            .catch(err =>  {
                expect(err.response.errors[0].message).to.eq('Field possibleLoops in NoloopsTest1 is breaking a @noloops directive!');
            });
        });

        it('noloops delete loop edge #1', async () => {
            let mutation = `mutation($id:ID!, $edgeId: ID!) {
                createNoloopsTest1(data:{}){ id @export(as:"id") }
                createPossibleLoopEdgeFromNoloopsTest1(data: {
                    sourceID: $id
                    targetID: $id
                }) { id @export(as:"edgeId")}
                deletePossibleLoopEdgeFromNoloopsTest1(id: $edgeId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => null)
                .catch(err =>  {
                    return new Error(`@noloops directive should not yield error deleting a loop edge`);
                });
            if(err != null) throw err;
        });

        it('noloops delete loop edge #2', async () => {
            let mutation = `mutation { createNoloopsTest1(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest1']['id']);

            let m = `mutation {
                createPossibleLoopEdgeFromNoloopsTest1(data: {
                    sourceID: "${id}"
                    targetID: "${id}"
                }) { id @export(as:"edgeId")}
                deletePossibleLoopEdgeFromNoloopsTest1(id: $edgeId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => null)
                .catch(err =>  {
                    return new Error(`@noloops directive should not yield error deleting a loop edge`);
                });
            if(err != null) throw err;
        });

        it('noloops delete loop list edge #1', async () => {
            let mutation = `mutation($id:ID!, $edgeId: ID!) {
                createNoloopsTest1(data:{}){ id @export(as:"id") }
                createPossibleLoopsEdgeFromNoloopsTest1(data: {
                    sourceID: $id
                    targetID: $id
                }) { id @export(as:"edgeId")}
                deletePossibleLoopsEdgeFromNoloopsTest1(id: $edgeId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => null)
                .catch(err =>  {
                    return new Error(`@noloops directive should not yield error deleting a loop edge`);
                });
            if(err != null) throw err;
        });

        it('noloops delete loop list edge #2', async () => {
            let mutation = `mutation { createNoloopsTest1(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest1']['id']);

            let m = `mutation {
                createPossibleLoopsEdgeFromNoloopsTest1(data: {
                    sourceID: "${id}"
                    targetID: "${id}"
                }) { id @export(as:"edgeId")}
                deletePossibleLoopsEdgeFromNoloopsTest1(id: $edgeId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => null)
                .catch(err =>  {
                    return new Error(`@noloops directive should not yield error deleting a loop edge`);
                });
            if(err != null) throw err;
        });

    });

    // Required for target needs to be updated, since the check need to be made for all imlementations of a required for target target
    describe('@requiredForTarget tests', () => {
        it('requiredForTarget create source', async () => {
            let mutation = `mutation { createRequiredForTargetTest(data:{}) { id } }`;
            await request(url, mutation)
                .catch((err) => {
                    throw new Error(`@requiredForTarget directive should not yield an error when creating source`)
                });
        });
        
        it('requiredForTarget create source and target', async () => {
            let mutation = `mutation { createRequiredForTargetTest(data:{ target: { create: {} } }) { id } }`;
            await request(url, mutation)
                .catch((err) => {
                    throw new Error(`@requiredForTarget directive should not yield an error for field`)
                });
        });

        it('requiredForTarget create source and targets', async () => {
            let mutation = `mutation { createRequiredForTargetsTest(data:{ targets: [{ create: {} }] }) { id } }`;
            await request(url, mutation)
                .catch((err) => {
                    throw new Error(`@requiredForTarget directive should not yield an error for list field`)
                });
        });
                
        it('requiredForTarget create source and connect target', async () => {
            let mutation = `mutation($targetId: ID!) {
                createRequiredForTargetTarget(data:{}) {id @export(as:"targetId")}
                createRequiredForTargetTest(data:{ target: { connect: $targetId } }) { id }
            }`;
            await request(url, mutation)
                .catch((err) => {
                    throw new Error(`@requiredForTarget directive should not yield an error for field`)
                });
        });

        it('requiredForTarget create source and connect targets', async () => {
            let mutation = `mutation($targetId: ID!) {
                createRequiredForTargetsTarget(data:{}) {id @export(as:"targetId")}
                createRequiredForTargetsTest(data:{ targets: [{ connect: $targetId }] }) { id }
            }`;
            await request(url, mutation)
                .catch((err) => {
                    throw new Error(`@requiredForTarget directive should not yield an error for field`)
                });
        });

        it('requiredForTarget add edge #1', async () => {
            let mutation = `mutation($sourceId: ID!, $targetId: ID!) {
                createRequiredForTargetTest(data:{}) { id @export(as:"sourceId") }
                createRequiredForTargetTarget(data:{}) { id @export(as:"targetId") }
                createTargetEdgeFromRequiredForTargetTest(data: { sourceID: $sourceId, targetID: $targetId }) { id }
            }`;
            await request(url, mutation)
                .catch((err) => {
                    throw new Error(`@requiredForTarget directive should not yield an error for field`)
                });
        });

        it('requiredForTarget add edge #2', async () => {
            let mutation = `mutation { createRequiredForTargetTest(data:{}) { id } }`;
            let sourceId = await request(url, mutation).then(data => data['createRequiredForTargetTest']['id']);
            
            let m = `mutation($targetId: ID!) {
                createRequiredForTargetTarget(data:{}) { id @export(as:"targetId") }
                createTargetEdgeFromRequiredForTargetTest(data: { sourceID: "${sourceId}", targetID: $targetId }) { id }
            }`;
            await request(url, m)
                .catch((err) => {
                    throw new Error(`@requiredForTarget directive should not yield an error for field`)
                });
        });

        it('requiredForTarget add list edge #1', async () => {
            let mutation = `mutation($sourceId: ID!, $targetId: ID!) {
                createRequiredForTargetsTest(data:{}) { id @export(as:"sourceId") }
                createRequiredForTargetsTarget(data:{}) { id @export(as:"targetId") }
                createTargetsEdgeFromRequiredForTargetsTest(data: { sourceID: $sourceId, targetID: $targetId }) { id }
            }`;
            await request(url, mutation)
                .catch((err) => {
                    throw new Error(`@requiredForTarget directive should not yield an error for list field`)
                });
        });

        it('requiredForTarget add list edge #2', async () => {
            let mutation = `mutation { createRequiredForTargetsTest(data:{}) { id } }`;
            let sourceId = await request(url, mutation).then(data => data['createRequiredForTargetsTest']['id']);
            
            let m = `mutation($targetId: ID!) {
                createRequiredForTargetsTarget(data:{}) { id @export(as:"targetId) }
                createTargetsEdgeForRequiredFfromTargetsTest(data: { sourceID: "${sourceId}", targetID: $targetId }) { id }
            }`;
            await request(url, mutation)
                .catch((err) => {
                    throw new Error(`@requiredForTarget directive should not yield an error for list field`)
                });
        });

        it('requiredForTarget create target should fail', async () => {
            let mutation = `mutation { createRequiredForTargetTarget(data:{}){ id } }`;
            let err = await request(url, mutation)
                .then(data => new Error(`@requiredForTarget directive should yield an error when creating only target`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field target in RequiredForTargetTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });

        it('requiredForTarget create targets should fail', async () => {
            let mutation = `mutation { createRequiredForTargetsTarget(data:{}){ id } }`;
            let err = await request(url, mutation)
                .then(data =>  new Error(`@requiredForTarget directive should yield an error when creating only targets`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field targets in RequiredForTargetsTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });

        it('requiredForTarget delete edge should fail #1', async () => {
            let mutation = `mutation($targetId:ID!, $sourceId: ID!, $edgeId:ID!) {
                createRequiredForTargetTarget(data:{}){ id @export(as:"targetId") }
                createRequiredForTargetTest(data:{}){ id @export(as:"sourceId") }
                createTargetEdgeFromRequiredForTargetTest(data:{ sourceID: $sourceId, targetID: $targetId }){ id @export(as:"edgeId") }
                deleteTargetEdgeFromRequiredForTargetTest(id:$edgeId){ id }
            }`;
            
            let err = await request(url, mutation)
                .then(data => new Error(`@requiredForTarget directive should yield an error when deleting field edge`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field target in RequiredForTargetTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });

        it('requiredForTarget delete edge should fail #2', async () => {
            let mutation = `mutation($targetId:ID!, $sourceId: ID!) {
                createRequiredForTargetTarget(data:{}){ id @export(as:"targetId") }
                createRequiredForTargetTest(data:{}){ id @export(as:"sourceId") }
                createTargetEdgeFromRequiredForTargetTest(data:{ sourceID: $sourceId, targetID: $targetId }){ id }
            }`;
            let edgeId = await request(url, mutation).then(data => data['createTargetEdgeFromRequiredForTargetTest']['id']);
            let m = `mutation { deleteTargetEdgeFromRequiredForTargetTest(id:"${edgeId}"){ id source { id } target { id } } }`
            let err = await request(url, m)
                .then(data => new Error(`@requiredForTarget directive should yield an error when deleting field edge`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field target in RequiredForTargetTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });

        it('requiredForTarget delete list edge should fail #1', async () => {
            let mutation = `mutation($targetId:ID!, $sourceId: ID!, $edgeId: ID!) {
                createRequiredForTargetsTarget(data:{}){ id @export(as:"targetId")}
                createRequiredForTargetsTest(data:{}){ id @export(as:"sourceId")}
                createTargetsEdgeFromRequiredForTargetsTest(data:{ sourceID: $sourceId, targetID: $targetId }){ id @export(as:"edgeId") }
                deleteTargetsEdgeFromRequiredForTargetsTest(id:$edgeId){ id }
            }`;
            
            let err = await request(url, mutation)
                .then(data => new Error(`@requiredForTarget directive should yield an error when deleting field edge`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field targets in RequiredForTargetsTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });

        it('requiredForTarget delete list edge should fail #2', async () => {
            let mutation = `mutation($targetId:ID!, $sourceId: ID!) {
                createRequiredForTargetsTarget(data:{}){ id @export(as:"targetId") }
                createRequiredForTargetsTest(data:{}){ id @export(as:"sourceId") }
                createTargetsEdgeFromRequiredForTargetsTest(data:{ sourceID: $sourceId, targetID: $targetId }){ id }
            }`;
            let edgeId = await request(url, mutation).then(data => data['createTargetsEdgeFromRequiredForTargetsTest']['id']);
            let m = `mutation { deleteTargetsEdgeFromRequiredForTargetsTest(id:"${edgeId}"){ id } }`;
            let err = await request(url, m)
                .then(data => new Error(`@requiredForTarget directive should yield an error when deleting field edge`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field targets in RequiredForTargetsTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });

        it('requiredForTarget delete source of field should fail #1', async () => {
            let mutation = `mutation($sourceId:ID!) {
                createRequiredForTargetTest(data:{ target: { create: {} } }){ id @export(as:"sourceId")}
                deleteRequiredForTargetTest(id:$sourceId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => new Error(`@requiredForTarget directive should yield an error when deleting source`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field target in RequiredForTargetTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });
        
        it('requiredForTarget delete source of field should fail #2', async () => {
            let mutation = `mutation { createRequiredForTargetTest(data:{ target: { create: {} } }){ id } }`;
            let id = await request(url, mutation).then(data => data['createRequiredForTargetTest']['id']);
            let m = `mutation { deleteRequiredForTargetTest(id:"${id}"){ id } }`;
            let err = await request(url, m)
                .then(data =>  new Error(`@requiredForTarget directive should yield an error when deleting source`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field target in RequiredForTargetTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });

        it('requiredForTarget delete and restore field', async () => {
            let mutation = `mutation($targetId: ID!, $sourceId:ID!) {
                createRequiredForTargetTarget(data:{}){ id @export(as:"targetId") }
                m1:createRequiredForTargetTest(data:{ target: { connect: $targetId } }){ id @export(as:"sourceId")}
                deleteRequiredForTargetTest(id:$sourceId){ id }
                m2:createRequiredForTargetTest(data:{ target: { connect: $targetId } }){ id }
            }`;
            await request(url, mutation)
                .catch((err) => {
                    return new Error(`@requiredForTarget directive should not yield an error when deleting and restoring edge within same transaction`);
                });
        });
    });

    // Unique for target needs to be updated, since the check needs to be made agains all imlementations of the target.
    describe("@##uniqueForTarget tests", () => {
        it('uniqueForTarget create object with no target(s)', async () => {
            let mutation = `mutation { createUniqueForTargetTest(data:{}) { id } }`;
            await request(url, mutation)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when not connecting to any object`);
                });
        });

        it('uniqueForTarget create target', async () => {
            let mutation = `mutation { createUniqueForTargetTarget(data:{}) { id } }`;
            await request(url, mutation)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when creating target`);
                });
        });
        
        // non-list field
        it('uniqueForTarget create object with target #1', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{ target: { create: { } } }) { id }
            }`;
            await request(url, mutation)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when connecting to unique target`);
                });
        });

        it('uniqueForTarget create object with target #2', async () => {
            let mutation = `mutation($targetId: ID!) {
                createUniqueForTargetTarget(data: {}) { id @export(as:"targetId")}
                createUniqueForTargetTest(data:{ target: { connect: $targetId } }) { id }
            }`;
            await request(url, mutation)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when connecting to unique target`);
                });
        });

        it('uniqueForTarget create object with target #3', async () => {
            let mutation = `mutation { createUniqueForTargetTarget(data: {}) { id } }`;
            let id = await request(url, mutation).then(data => data['createUniqueForTargetTarget']['id']);
            let m = `mutation {
                createUniqueForTargetTest(data:{ target: { connect: "${id}" } }) { id }
            }`;
            await request(url, m)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when connecting to unique target`);
                });
        });

        it('uniqueForTarget connect to non-unique target should fail #1', async () => {
            let mutation = `mutation($id: ID!) {
                createUniqueForTargetTarget(data:{}) { id @export(as:"id") }
                m1:createUniqueForTargetTest(data:{ target: { connect: $id } }) { id }
                m2:createUniqueForTargetTest(data:{ target: { connect: $id } }) { id }
            }`;
            let err = await request(url, mutation)
                .then((data) => new Error(`@uniqueForTarget directive should yield an error when connecting to non-unique target`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field target in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
            if(err != null) throw err;
        });

        it('uniqueForTarget connect to non-unique target should fail #2', async () => {
            let mutation = `mutation { createUniqueForTargetTarget(data:{}) { id } }`;
            let id = await request(url, mutation).then(data => data['createUniqueForTargetTarget']['id']);
            let m = `mutation {
                m1:createUniqueForTargetTest(data:{ target: { connect: "${id}" } }) { id }
                m2:createUniqueForTargetTest(data:{ target: { connect: "${id}" } }) { id }
            }`;
            let err = await request(url, m)
                .then(data => new Error(`@uniqueForTarget directive should yield an error when connecting to non-unique target`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field target in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
            if(err != null) throw err;
        });

        it('uniqueForTarget delete violating target #1', async () => {
            let mutation = `mutation { createUniqueForTargetTarget(data:{}) { id } }`;
            let targetId = await request(url, mutation).then(data => data['createUniqueForTargetTarget']['id']);
            let m = `mutation($id: ID!) {
                m1:createUniqueForTargetTest(data:{ target: { connect: "${targetId}" } }) { id @export(as:"id") }
                deleteUniqueForTargetTest(id: $id) { id }
                m2:createUniqueForTargetTest(data:{ target: { connect: "${targetId}" } }) { id }
            }`;
            await request(url, m)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when deleting violating source`);
                })
        });

        it('uniqueForTarget delete violating target #2', async () => {
            let mutation = `mutation($targetId: ID!) {
                createUniqueForTargetTarget(data:{}) { id @export(as:"targetId") }
                createUniqueForTargetTest(data:{ target: { connect: $targetId } }) { id }
            }`;
            let id, targetId;
            await request(url, mutation).then(data => {
                targetId = data['createUniqueForTargetTarget']['id'];
                id = data['createUniqueForTargetTest']['id'];
            });
            let m = `mutation {
                m1:createUniqueForTargetTest(data:{ target: { connect: "${targetId}" } }) { id }
                deleteUniqueForTargetTest(id: "${id}") { id }
            }`;
            await request(url, m)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when deleting violating source`);
                })
        });

        it('uniqueForTarget delete violating edge for target #1', async () => {
            let mutation = `mutation($id1: ID!, $id2: ID!,$targetId: ID!, $edgeId: ID!) {
                createUniqueForTargetTarget(data:{}) { id @export(as:"targetId") }
                m1:createUniqueForTargetTest(data:{}) { id @export(as:"id1") }
                m2:createUniqueForTargetTest(data:{}) { id @export(as:"id2")}
                m3:createTargetEdgeFromUniqueForTargetTest(data: { sourceID: $id1, targetID: $targetId }) { id @export(as:"edgeId") }
                m4:createTargetEdgeFromUniqueForTargetTest(data: { sourceID: $id2, targetID: $targetId }) { id }
                deleteTargetEdgeFromUniqueForTargetTest(id: $edgeId) { id }
            }`;
            await request(url, mutation)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when deleting violating edge`);
                })
        });

        it('uniqueForTarget delete violating edge for target #2', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{ target: { create: {}}}) {
                    id
                    _outgoingTargetEdgesFromUniqueForTargetTest { id }
                    target { id }
                }
            }`;
            let edgeId, targetId;
            await request(url, mutation).then(data => {
                edgeId = data['createUniqueForTargetTest']['_outgoingTargetEdgesFromUniqueForTargetTest']['id'];
                targetId = data['createUniqueForTargetTest']['target']['id'];
            });
            let m1 = `mutation { deleteTargetEdgeFromUniqueForTargetTest(id: "${edgeId}") { id } }`;
            await request(url, m1);

            let m2 = `mutation { createUniqueForTargetTest(data:{ target: { connect: "${targetId}" } }) { id } }`;
            await request(url, m2)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when deleting violating edge`);
                })
        });

        // list fields
        // Note: Don't really make sense for unique for target, since only one target can be connected at a time
        it('uniqueForTarget create object with targets #1', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{ targets: [{ create: { } }] }) { id }
            }`;
            await request(url, mutation)
                .catch(err =>  new Error(`@uniqueForTarget directive should not yield an error when connecting to one target`));
        });

        it('uniqueForTarget create object with targets #2', async () => {
            let mutation = `mutation($targetId: ID!) {
                m1:createUniqueForTargetTarget(data: {}) { id @export(as:"targetId")}
                createUniqueForTargetTest(data:{ targets: [{ connect: $targetId }] }) { id }
            }`;
            await request(url, mutation)
                .catch(err =>  new Error(`@uniqueForTarget directive should not yield an error when connecting to one target`));
        });

        it('uniqueForTarget create object with targets #3', async () => {
            let mutation = `mutation {
                createUniqueForTargetTarget(data: {}) { id }
            }`;
            let id = await request(url, mutation).then(data =>  data['createUniqueForTargetTarget']['id']);
            let m = `mutation {
                createUniqueForTargetTest(data:{ targets: [{ connect: "${id}" }] }) { id }
            }`;
            await request(url, m)
                .catch(err =>  new Error(`@uniqueForTarget directive should not yield an error when connecting to one target`));
        });
        
        it('uniqueForTarget create object with targets should fail #1', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{ targets: [{ create: { } }, { create: { } }] }) { id }
            }`;
            await request(url, mutation)
                .then(data =>  new Error(`@uniqueForTarget directive should yield an error when connecting to two targets`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field targets in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
        });

        it('uniqueForTarget create object with targets should fail #2', async () => {
            let mutation = `mutation($targetId1: ID!, $targetId2: ID!) {
                m1:createUniqueForTargetTarget(data: {}) { id @export(as:"targetId1")}
                m2:createUniqueForTargetTarget(data: {}) { id @export(as:"targetId2")}
                createUniqueForTargetTest(data:{ targets: [{ connect: $targetId1 }, { connect: $targetId2 }] }) { id }
            }`;
            await request(url, mutation)
                .then((data) => new Error(`@uniqueForTarget directive should yield an error when connecting to two targets`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field targets in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
        });

        it('uniqueForTarget create object with targets should fail #3', async () => {
            let mutation = `mutation {
                m1:createUniqueForTargetTarget(data: {}) { id }
                m2:createUniqueForTargetTarget(data: {}) { id }
            }`;
            let id1, id2;
            await request(url, mutation).then(data => {
                id1 = data['m1']['id'];
                id2 = data['m2']['id'];
            });
            let m = `mutation {
                createUniqueForTargetTest(data:{ targets: [{ connect: "${id1}" }, { connect: "${id2}" }] }) { id }
            }`;
            await request(url, m)
                .then((data) => new Error(`@uniqueForTarget directive should yield an error when connecting to two targets`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field targets in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
        });

        it('uniqueForTarget connect to non-unique targets should fail #1', async () => {
            let mutation = `mutation($id: ID!) {
                createUniqueForTargetTarget(data:{}) { id @export(as:"id") }
                m1:createUniqueForTargetTest(data:{ targets: [{ connect: $id }] }) { id }
                m2:createUniqueForTargetTest(data:{ targets: [{ connect: $id }] }) { id }
            }`;
            let err = await request(url, mutation)
                .then((data) => new Error(`@uniqueForTarget directive should yield an error when connecting to non-unique targets`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field targets in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
            if(err != null) throw err;
        });

        it('uniqueForTarget connect to non-unique targets should fail #2', async () => {
            let mutation = `mutation { createUniqueForTargetTarget(data:{}) { id } }`;
            let id = await request(url, mutation).then(data => data['createUniqueForTargetTarget']['id']);
            let m = `mutation {
                m1:createUniqueForTargetTest(data:{ targets: [{ connect: "${id}" } ]}) { id }
                m2:createUniqueForTargetTest(data:{ targets: [{ connect: "${id}" } ]}) { id }
            }`;
            let err = await request(url, m)
                .then(data => new Error(`@uniqueForTarget directive should yield an error when connecting to non-unique targets`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field targets in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
            if(err != null) throw err;
        });

        it('uniqueForTarget creating same edge twice should fail', async () => {
            let mutation = `mutation { createUniqueForTargetTarget(data:{}) { id } }`;
            let id = await request(url, mutation).then(data => data['createUniqueForTargetTarget']['id']);
            let m = `mutation {
                createUniqueForTargetTest(data:{ targets: [{ connect: "${id}" }, { connect: "${id}" }] }) { id }
            }`;
            let err = await request(url, m)
                .then(data => {
                    return new Error(`@uniqueForTarget directive should yield an error when creating the same edge multiple times`);
                })
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field targets in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
            if(err != null) throw err;
        });

        it('uniqueForTarget delete violating targets #1', async () => {
            let mutation = `mutation { createUniqueForTargetTarget(data:{}) { id } }`;
            let targetId = await request(url, mutation).then(data => data['createUniqueForTargetTarget']['id']);
            let m = `mutation($id: ID!) {
                m1:createUniqueForTargetTest(data:{ targets: [{ connect: "${targetId}" }] }) { id @export(as:"id") }
                deleteUniqueForTargetTest(id: $id) { id }
                m2:createUniqueForTargetTest(data:{ targets: [{ connect: "${targetId}" }] }) { id }
            }`;
            await request(url, m)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when deleting violating source`);
                })
        });

        it('uniqueForTarget delete violating targets #2', async () => {
            let mutation = `mutation($targetId: ID!) {
                createUniqueForTargetTarget(data:{}) { id @export(as:"targetId") }
                createUniqueForTargetTest(data:{ targets: [{ connect: $targetId }] }) { id }
            }`;
            let id, targetId;
            await request(url, mutation).then(data => {
                targetId = data['createUniqueForTargetTarget']['id'];
                id = data['createUniqueForTargetTest']['id'];
            });
            let m = `mutation {
                m1:createUniqueForTargetTest(data:{ targets: [{ connect: "${targetId}" }] }) { id }
                deleteUniqueForTargetTest(id: "${id}") { id }
            }`;
            await request(url, m)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when deleting violating source`);
                })
        });

        it('uniqueForTarget delete violating edge #1', async () => {
            let mutation = `mutation($id1: ID!, $id2: ID!,$targetId: ID!, $edgeId: ID!) {
                createUniqueForTargetTarget(data:{}) { id @export(as:"targetId") }
                m1:createUniqueForTargetTest(data:{}) { id @export(as:"id1") }
                m2:createUniqueForTargetTest(data:{}) { id @export(as:"id2")}
                m3:createTargetsEdgeFromUniqueForTargetTest(data: { sourceID: $id1, targetID: $targetId }) { id @export(as:"edgeId") }
                m4:createTargetsEdgeFromUniqueForTargetTest(data: { sourceID: $id2, targetID: $targetId }) { id }
                deleteTargetsEdgeFromUniqueForTargetTest(id: $edgeId) { id }
            }`;
            await request(url, mutation)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when deleting violating edge`);
                })
        });

        it('uniqueForTarget delete violating edge #2', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{ targets: [{ create: {} }] }) {
                    id
                    _outgoingTargetsEdgesFromUniqueForTargetTest { id }
                    targets { id }
                }
            }`;
            let edgeId, targetId;
            await request(url, mutation).then(data => {
                edgeId = data['createUniqueForTargetTest']['_outgoingTargetsEdgesFromUniqueForTargetTest'][0]['id'];
                targetId = data['createUniqueForTargetTest']['targets'][0]['id'];
            });
            let m1 = `mutation { deleteTargetsEdgeFromUniqueForTargetTest(id: "${edgeId}") { id } }`;
            await request(url, m1);

            let m2 = `mutation { createUniqueForTargetTest(data:{ targets: [{ connect: "${targetId}" }] }) { id } }`;
            await request(url, m2)
                .catch(err => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when deleting violating edge`);
                })
        });

    });

    after((done) => {
        testServer.server.close(done);
    });
});


