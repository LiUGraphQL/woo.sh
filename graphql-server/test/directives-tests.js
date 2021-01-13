const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const { makeServer } = require('../server');
const { request, gql } = require('graphql-request');
const { readFileSync } = require('fs');

// Schema before API generation
let baseSchema = readFileSync('./test/resources/directives-tests-api.graphql', 'utf8'); // relative to root
let resolvers = require('./resources/directives-tests-resolvers.js'); // relative to test file
const { isBuffer } = require('util');

let testServer;
let url;

describe('# directives tests', () => {
    before((done) => {
        let options = {
            baseSchema,
            resolvers,
            'driver': 'arangodb',
            'dbName': 'test-db',
            'dbUrl': 'http://localhost:8529',
            'drop': true,
            'disableDirectivesChecking': false,
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

    describe('@distinct tests', () => {
        it('distinct connects #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createDistinctTest(data:{ testDummyField: 0 }) { id @export(as:"id1")}
                m2:createDistinctTest(data:{ testDummyField: 0 }) { id @export(as:"id2")}
                m3:createDistinctTest(data:{ shouldBeDistinct: [ { connect: $id1 }, { connect: $id2 } ]}) { id }
            }`;

            await request(url, mutation)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield error for when connecting two different objects`);
                });
        });

        it('distinct connects #2', async () => {
            let mutation = `mutation {
                m1:createDistinctTest(data:{ testDummyField: 0 }) { id }
                m2:createDistinctTest(data:{ testDummyField: 0 }) { id }
            }`;
            let id1, id2;
            await request(url, mutation)
                .then((data) => {
                    id1 = data['m1']['id'];
                    id2 = data['m2']['id'];
                });
            let m = `mutation {
                createDistinctTest(data:{
                    shouldBeDistinct: [ { connect: "${id1}" },{ connect: "${id2}" } ]}) { id }
                }`;
            await request(url, m).then(() => null);
        });

        it('distinct non-distinct connects should fail #1', async () => {
            let mutation = `mutation($id:ID!) {
                m1:createDistinctTest(data:{}) { id @export(as:"id")}
                m2:createDistinctTest(data:{ shouldBeDistinct: [ { connect: $id }, { connect: $id } ]}) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@distinct directive should yield error when connecting two the same object twice`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq('Field shouldBeDistinct in DistinctTest is breaking a @distinct directive!');
                    return null;
                });
            if(err != null) throw err;
        });

        it('distinct non-distinct connects should fail #2', async () => {
            let mutation = `mutation {
                createDistinctTest(data:{}) { id }
            }`;

            let id;
            await request(url, mutation)
                .then((data) => {
                    id = data['createDistinctTest']['id'];
                });

            let m = `mutation {
                createDistinctTest(data:{
                    shouldBeDistinct: [ { connect: "${id}" },{ connect: "${id}" } ]}) { id }
                }`;
            let err = await request(url, m)
                .then(() => new Error(`@distinct directive should yield error when connecting two the same object twice`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq('Field shouldBeDistinct in DistinctTest is breaking a @distinct directive!');
                    return null;
                });
            if(err != null) throw err;
        });

        it('distinct add distinct edge #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createDistinctTest(data:{}) { id @export(as:"id1")}
                m2:createDistinctTest(data:{}) { id @export(as:"id2")}
                m3:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: $id1 targetID: $id2 }) { id }
                m4:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: $id1 targetID: $id1 }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield an error when adding two edges to different objects`);
                });
        });

        it('distinct add edge #2', async () => {
            let mutation = `mutation {
                m1:createDistinctTest(data:{}) { id }
                m2:createDistinctTest(data:{}) { id }
            }`;

            let id1, id2;
            await request(url, mutation)
                .then((data) => {
                    id1 = data['m1']['id'];
                    id2 = data['m2']['id'];
                });
            let m = `mutation {
                m1:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id }
                m2:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id1}" targetID: "${id1}" }) { id }
            }`;
            await request(url, m)
                .then(() => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield an error when adding two edges to different objects`);
                });
        });

        it('distinct add non-distinct edge should fail #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createDistinctTest(data:{}) { id @export(as:"id1")}
                m2:createDistinctTest(data:{}) { id @export(as:"id2")}
                m3:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: $id1 targetID: $id2 }) { id }
                m4:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: $id1 targetID: $id2 }) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@distinct directive should yield an error for when adding an edge to the same object twice`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq('Field shouldBeDistinct in DistinctTest is breaking a @distinct directive!');
                    return null;
                });
            if(err != null) throw err;
        });

        it('distinct add non-distinct edge should fail #2', async () => {
            let mutation = `mutation {
                m1:createDistinctTest(data:{}) { id }
                m2:createDistinctTest(data:{}) { id }
            }`;
            let id1, id2;
            await request(url, mutation)
                .then((data) => {
                    id1 = data['m1']['id'];
                    id2 = data['m2']['id'];
                });

            let m = `mutation {
                m1:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id }
                m2:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id }
            }`;

            let err = await request(url, m)
                .then(() => new Error(`@distinct directive should yield an error for when adding an edge to the same object twice`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq('Field shouldBeDistinct in DistinctTest is breaking a @distinct directive!');
                    return null;
                });
            if(err != null) throw err;
        });

        it('distinct delete non-distinct edge #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!, $edgeId: ID!) {
                m1:createDistinctTest(data:{}) { id @export(as:"id1")}
                m2:createDistinctTest(data:{}) { id @export(as:"id2")}
                m3:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: $id1 targetID: $id2 }) { id }
                m4:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: $id1 targetID: $id2 }) { id @export(as:"edgeId")}
                deleteShouldBeDistinctEdgeFromDistinctTest(id: $edgeId) { id }
            }`;
            await request(url, mutation)
                .then(data => null)
                .catch(err => {
                    console.log(err)
                    throw new Error(`@distinct directive should not yield an error when non-distinct edge is deleted within the same mutation`);
                });
        });

        it('distinct delete non-distinct edge #2', async () => {
            let mutation = `mutation {
                m1:createDistinctTest(data:{}) { id }
                m2:createDistinctTest(data:{}) { id }
            }`;

            let id1, id2;
            await request(url, mutation)
                .then(data => {
                    id1 = data['m1']['id'];
                    id2 = data['m2']['id'];
                })
            
            let m = `mutation($edgeId: ID!) {
                m1:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id }
                m2:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id @export(as:"edgeId")}
                deleteShouldBeDistinctEdgeFromDistinctTest(id: $edgeId) { id }
            }`;
            await request(url, m)
                .then(data => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield an error when non-distinct edge is deleted within the same mutation`);
                });
        });

        it('distinct delete non-distinct edge #3', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createDistinctTest(data:{}) { id @export(as:"id1")}
                m2:createDistinctTest(data:{}) { id @export(as:"id2")}
                m3:createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: $id1 targetID: $id2 }) { id }
            }`;

            let id1, id2, edgeId;
            await request(url, mutation)
                .then(data => {
                    id1 = data['m1']['id'];
                    id2 = data['m2']['id'];
                    edgeId = data['m3']['id'];
                })
            
            let m = `mutation {
                createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id1}" targetID: "${id2}" }) { id }
                deleteShouldBeDistinctEdgeFromDistinctTest(id: "${edgeId}") { id }
            }`;
            await request(url, m)
                .then(data => null)
                .catch(err => {
                    throw new Error(`@distinct directive should not yield an error when non-distinct edge is deleted within the same mutation`);
                });
        });
    });

    describe('@required tests', () => {
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
            if(err != null) {
                console.log(err);
                throw err;
            }
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
                .then(() => null)
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

            let id;
            await request(url, mutation)
                .then(data => {
                    id = data['createRequiredTest']['required']['id'];
                });
            
            let m = `
            mutation {
                deleteRequiredField(id: "${id}") { id }
            }`;

            let err = await request(url, m)
                .then(() => null)
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
                .then(() => null)
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

            let id;
            await request(url, mutation)
                .then(data => {
                    id = data['createRequiredTest']['requiredList']['id'];
                });
            
            let m = `
            mutation {
                deleteRequiredField(id: "${id}") { id }
            }`;

            let err = await request(url, m)
                .then(() => null)
                .catch((err) =>  {
                    expect(err.response.errors[0].message).to.eq("Field required in RequiredTest is breaking a @required directive!");
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

            let edgeId;
            await request(url, mutation)
                .then(data => {
                    edgeId = data['createRequiredEdgeFromRequiredTest']['id'];
                });
            
            let m = `
            mutation {
                deleteRequiredEdgeFromRequiredTest(id: "${edgeId}"){ id }
            }
            `;
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

    describe('@noloops tests', () => {
        it('noloops field create', async () => {
            let mutation = `mutation {
                createNoloopsTest(data:{ possibleLoop: { create: {} } }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when creating new object`)
                });
        });

        it('noloops list field create', async () => {
            let mutation = `mutation {
                createNoloopsTest(data:{ possibleLoops: [{ create: {} }] }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when creating new objects`)
                });
        });

        it('noloops field connect #1', async () => {
            let mutation = `mutation { createNoloopsTest(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest']['id']);
            let m = `mutation { createNoloopsTest(data:{ possibleLoop: { connect: "${id}" } }) { id } }`;

            await request(url, m)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when connecting to new object`)
                });
        });

        it('noloops field connect #2', async () => {
            let mutation = `mutation($id: ID!) {
                m1:createNoloopsTest(data: {}){ id @export(as:"id") }
                m2:createNoloopsTest(data:{ possibleLoop: { connect: $id } }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when connecting to new object`)
                });
        });

        it('noloops list field connect #1', async () => {
            let mutation = `mutation { createNoloopsTest(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest']['id']);
            let m = `mutation { createNoloopsTest(data:{ possibleLoops: [{ connect: "${id}" }] }) { id } }`;

            await request(url, m)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when connecting to new object`)
                });
        });

        it('noloops list field connect #2', async () => {
            let mutation = `mutation($id: ID!) {
                m1:createNoloopsTest(data: {}){ id @export(as:"id") }
                m2:createNoloopsTest(data:{ possibleLoops: [{ connect: $id }] }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error when connecting to new objects`)
                });
        });

        it('noloops add edge #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createNoloopsTest(data:{}){ id @export(as:"id1") }
                m2:createNoloopsTest(data:{}){ id @export(as:"id2") }
                createPossibleLoopEdgeFromNoloopsTest(data: {
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
                m1:createNoloopsTest(data:{}){ id }
                m2:createNoloopsTest(data:{}){ id }
            }`;
            let id1, id2;
            await request(url, mutation).then(data => {
                id1 = data['m1']['id'];
                id2 = data['m2']['id'];
            });
            let m = `mutation {
                createPossibleLoopEdgeFromNoloopsTest(data: { sourceID: "${id1}", targetID: "${id2}" }) { id }
            }`;

            await request(url, m)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error adding edge between different objects`)
                });
        });

        it('noloops add list edge #1', async () => {
            let mutation = `mutation($id1:ID!, $id2:ID!) {
                m1:createNoloopsTest(data:{}){ id @export(as:"id1") }
                m2:createNoloopsTest(data:{}){ id @export(as:"id2") }
                createPossibleLoopsEdgeFromNoloopsTest(data: {
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
                m1:createNoloopsTest(data:{}){ id }
                m2:createNoloopsTest(data:{}){ id }
            }`;
            let id1, id2;
            await request(url, mutation).then(data => {
                id1 = data['m1']['id'];
                id2 = data['m2']['id'];
            });
            let m = `mutation {
                createPossibleLoopsEdgeFromNoloopsTest(data: { sourceID: "${id1}", targetID: "${id2}" }) { id }
            }`;

            await request(url, m)
                .catch(err =>  {
                    throw new Error(`@noloops directive should not yield error adding edge between different objects`)
                });
        });

        it('noloops add edge loop should fail #1', async () => {
            let mutation = `mutation($id:ID!) {
                createNoloopsTest(data:{}){ id @export(as:"id") }
                createPossibleLoopEdgeFromNoloopsTest(data: {
                    sourceID: $id
                    targetID: $id
                }) { id }
            }`;
            await request(url, mutation)
            .then(data =>  new Error(`@noloops directive should yield error adding a loop edge`))
            .catch(err =>  {
                expect(err.response.errors[0].message).to.eq('Field possibleLoop in NoloopsTest is breaking a @noloops directive!');
            });
        });

        it('noloops add edge loop should fail #2', async () => {
            let mutation = `mutation { createNoloopsTest(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest']['id']);
            let m = `mutation {
                createPossibleLoopEdgeFromNoloopsTest(data: {
                    sourceID: "${id}"
                    targetID: "${id}"
                }) { id }
            }`;

            await request(url, m)
            .then(data =>  new Error(`@noloops directive should yield error adding a loop edge`))
            .catch(err =>  {
                expect(err.response.errors[0].message).to.eq('Field possibleLoop in NoloopsTest is breaking a @noloops directive!');
            });
        });

        it('noloops add list edge loop should fail #1', async () => {
            let mutation = `mutation($id:ID!) {
                createNoloopsTest(data:{}){ id @export(as:"id") }
                createPossibleLoopsEdgeFromNoloopsTest(data: {
                    sourceID: $id
                    targetID: $id
                }) { id }
            }`;
            await request(url, mutation)
            .then(data =>  new Error(`@noloops directive should yield error adding a loop edge`))
            .catch(err =>  {
                expect(err.response.errors[0].message).to.eq('Field possibleLoops in NoloopsTest is breaking a @noloops directive!');
            });
        });

        it('noloops add list edge loop should fail #2', async () => {
            let mutation = `mutation { createNoloopsTest(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest']['id']);
            let m = `mutation {
                createPossibleLoopsEdgeFromNoloopsTest(data: {
                    sourceID: "${id}"
                    targetID: "${id}"
                }) { id }
            }`;

            await request(url, m)
            .then(data =>  new Error(`@noloops directive should yield error adding a loop edge`))
            .catch(err =>  {
                expect(err.response.errors[0].message).to.eq('Field possibleLoops in NoloopsTest is breaking a @noloops directive!');
            });
        });

        it('noloops delete loop edge #1', async () => {
            let mutation = `mutation($id:ID!, $edgeId: ID!) {
                createNoloopsTest(data:{}){ id @export(as:"id") }
                createPossibleLoopEdgeFromNoloopsTest(data: {
                    sourceID: $id
                    targetID: $id
                }) { id @export(as:"edgeId")}
                deletePossibleLoopEdgeFromNoloopsTest(id: $edgeId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => null)
                .catch(err =>  {
                    return new Error(`@noloops directive should not yield error deleting a loop edge`);
                });
            if(err != null) throw err;
        });

        it('noloops delete loop edge #2', async () => {
            let mutation = `mutation { createNoloopsTest(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest']['id']);

            let m = `mutation {
                createPossibleLoopEdgeFromNoloopsTest(data: {
                    sourceID: "${id}"
                    targetID: "${id}"
                }) { id @export(as:"edgeId")}
                deletePossibleLoopEdgeFromNoloopsTest(id: $edgeId){ id }
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
                createNoloopsTest(data:{}){ id @export(as:"id") }
                createPossibleLoopsEdgeFromNoloopsTest(data: {
                    sourceID: $id
                    targetID: $id
                }) { id @export(as:"edgeId")}
                deletePossibleLoopsEdgeFromNoloopsTest(id: $edgeId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => null)
                .catch(err =>  {
                    return new Error(`@noloops directive should not yield error deleting a loop edge`);
                });
            if(err != null) throw err;
        });

        it('noloops delete loop list edge #2', async () => {
            let mutation = `mutation { createNoloopsTest(data:{}){ id } }`;
            let id = await request(url, mutation).then(data => data['createNoloopsTest']['id']);

            let m = `mutation {
                createPossibleLoopsEdgeFromNoloopsTest(data: {
                    sourceID: "${id}"
                    targetID: "${id}"
                }) { id @export(as:"edgeId")}
                deletePossibleLoopsEdgeFromNoloopsTest(id: $edgeId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => null)
                .catch(err =>  {
                    return new Error(`@noloops directive should not yield error deleting a loop edge`);
                });
            if(err != null) throw err;
        });

    });

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
            console.log(m)
            let err = await request(url, m)
                .then(data => new Error(`@requiredForTarget directive should yield an error when deleting source`))
                .catch((err) => {
                    console.log(err)
                    expect(err.response.errors[0].message).to.eq("Field target in RequiredForTargetTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });

        /*
        it('delete source of field should fail', async () => {
            let mutation = `mutation($sourceId:ID!) {
                createRequiredForTargetTest(data:{
                    target: { create: {} }
                }){ id @export(as:"sourceId")}
                deleteRequiredForTargetTest(id:$sourceId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => new Error(`@requiredForTarget directive should yield an error when deleting source`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field target in RequiredForTargetTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });

        it('delete source of list field should fail', async () => {
            let mutation = `mutation($sourceId:ID!) {
                createRequiredForTargetsTest(data:{
                    targets: { create: {} }
                }){ id @export(as:"sourceId")}
                deleteRequiredForTargetsTest(id:$sourceId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => new Error(`@requiredForTarget directive should yield an error when deleting source`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field targets in RequiredForTargetsTest is breaking a @requiredForTarget directive!");
                });
            if(err) throw err;
        });

        it('delete target of field #test', async () => {
            let mutation = `mutation($targetId:ID!) {
                createRequiredForTargetTarget(data:{}){ id @export(as:"targetId") }
                createRequiredForTargetTest(data:{ target: { connect: $targetId } }){ id }
                deleteRequiredForTargetTarget(id:$targetId){ id }
            }`;
            let err = await request(url, mutation)
                .then(data => null)
                .catch((err) => {
                    console.log(err)
                    return new Error(`@requiredForTarget directive should not yield an error when deleting target`)
                });
            if(err) throw err;
        });
        */
    });

    /*
    describe("@uniqueForTarget tests #test", () => {
        it('create object with target', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{
                    target: { create: { testDummyField: 0 } }
                }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch(err => {
                    console.log(err);
                    throw new Error(`@uniqueForTarget directive should not yield an error when creating nested target object`);
                });
        });

        it('create object with targets', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{
                    targets: [
                        { create: { testDummyField: 0 } },
                        { create: { testDummyField: 0 } }
                    ]
                }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch(err => {
                    console.log(err);
                    throw new Error(`@uniqueForTarget directive should not yield an error when creating nested target objects`);
                });
        });

        it('create object and connect to target', async () => {
            let mutation = `mutation($id: ID!) {
                createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id @export(as:"id") }
                createUniqueForTargetTest(data:{ target: { connect: $id } }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch(err => {
                    console.log(err);
                    throw new Error(`@uniqueForTarget directive should not yield an error when connecting to new target`);
                });
        });

        it('connecting to target twice should fail', async () => {
            let mutation = `mutation($id: ID!) {
                createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id @export(as:"id") }
                m1:createUniqueForTargetTest(data:{ target: { connect: $id } }) { id }
                m2:createUniqueForTargetTest(data:{ target: { connect: $id } }) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@uniqueForTarget directive should yield an error when connecting twice to target object`))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field target in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
            if(err != null){
                console.log(err);
                throw err;
            }
        });

        it('connecting to targets twice should fail', async () => {
            let mutation = `mutation($id: ID!) {
                createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id @export(as:"id") }
                m1:createUniqueForTargetTest(data:{ targets: [{ connect: $id }] }) { id }
                m2:createUniqueForTargetTest(data:{ targets: [{ connect: $id }] }) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@uniqueForTarget directive should yield an error when connecting twice to target object`))
                .catch((err) => {
                    expect(err.response.errors[0].message).to.eq("Field targets in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
            if(err != null){
                console.log(err);
                throw err;
            }
        });

        it('add edge to target', async () => {
            let mutation = `mutation($source: ID!, $target: ID!) {
                createUniqueForTargetTest(data:{}) { id @export(as:"source")}
                createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id @export(as:"target") }
                createTargetEdgeFromUniqueForTargetTest(data:{ sourceID: $source, targetID: $target }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err => {
                    console.log(err);
                    throw new Error("@uniqueForTarget directive should not yield an error when creating an edge between source and target")
                });
        });

        it('add edges to targets', async () => {
            let mutation = `mutation($source: ID!, $target1: ID!, $target2: ID!) {
                createUniqueForTargetTest(data:{}) { id @export(as:"source")}
                m1:createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id @export(as:"target1") }
                m2:createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id @export(as:"target2") }
                m3:createTargetsEdgeFromUniqueForTargetTest(data:{ sourceID: $source, targetID: $target1 }) { id }
                m4:createTargetsEdgeFromUniqueForTargetTest(data:{ sourceID: $source, targetID: $target2 }) { id }
            }`;
            await request(url, mutation)
                .then(() => null)
                .catch(err => {
                    console.log(err);
                    throw new Error("@uniqueForTarget directive should not yield an error when creating edges between source and targets")
                });
        });

        it('add extra edge to target should fail', async () => {
            let mutation = `mutation($source1: ID!, $source2: ID!, $target: ID!) {
                m1:createUniqueForTargetTest(data:{}) { id @export(as:"source1") }
                m2:createUniqueForTargetTest(data:{}) { id @export(as:"source2") }
                createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id @export(as:"target") }
                m3:createTargetEdgeFromUniqueForTargetTest(data:{ sourceID: $source1, targetID: $target }) { id }
                m4:createTargetEdgeFromUniqueForTargetTest(data:{ sourceID: $source2, targetID: $target }) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error("@uniqueForTarget directive should not yield an error when creating an edge between source and target"))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field target in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
            if(err != null){
                console.log(err);
                throw err;
            }
        });

        it('add extra edge to targets should fail', async () => {
            let mutation = `mutation($source1: ID!, $source2: ID!, $target: ID!) {
                m1:createUniqueForTargetTest(data:{}) { id @export(as:"source1") }
                m2:createUniqueForTargetTest(data:{}) { id @export(as:"source2") }
                createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id @export(as:"target") }
                m3:createTargetsEdgeFromUniqueForTargetTest(data:{ sourceID: $source1, targetID: $target }) { id }
                m4:createTargetsEdgeFromUniqueForTargetTest(data:{ sourceID: $source2, targetID: $target }) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error("@uniqueForTarget directive should not yield an error when creating an edge between source and target"))
                .catch(err => {
                    expect(err.response.errors[0].message).to.eq("Field targets in UniqueForTargetTest is breaking a @uniqueForTarget directive!")
                });
            if(err != null){
                console.log(err);
                throw err;
            }
        });
    });
        */

    after((done) => {
        testServer.server.close(done);
    });
});


