const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const { makeServer } = require('../server');
const { request, gql } = require('graphql-request');
const { readFileSync } = require('fs');

// Schema before API generation
let baseSchema = readFileSync('./test/resources/directives-tests-api.graphql', 'utf8'); // relative to root
let resolvers = require('./resources/directives-tests-resolvers.js'); // relative to test file

let testServer;
let url;


describe('# directives tests', () => {
    before((done) => {
        let options = {
            baseSchema,
            resolvers,
            'driver': 'arangodb',
            'dbName': 'starwars-db',
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
        let id1;
        let id2;
        let id3;

        it('distinct connects', async () => {
            let m = `mutation {
                m1:createDistinctTest(data:{ testDummyField: 0 }) { id }
                m2:createDistinctTest(data:{ testDummyField: 0 }) { id }
                m3:createDistinctTest(data:{ testDummyField: 0 }) { id }
            }`;
            await request(url, m).then((data) => {
                id1 = data.m1.id;
                id2 = data.m2.id;
                id3 = data.m3.id;
            });

            let mutation = `mutation {
                createDistinctTest(data:{ shouldBeDistinct: [ { connect: "${id1}"}, { connect: "${id2}" } ]}) { id }
            }`;

            let err = await request(url, mutation)
                .then(() => null)
                .catch(() => new Error(`@distinct directive should not yield error for when connecting two different objects`));
            if(err != null) throw err;
        });

        it('non-distinct connects should fail', async () => {
            let mutation = `mutation {
                createDistinctTest(data:{ shouldBeDistinct: [ { connect: "${id1}"}, { connect: "${id1}" } ]}) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@distinct directive should yield error when connecting two the same object twice`))
                .catch((err) => null);
            if(err != null) throw err;
        });

        it('add distinct edge', async () => {
            let mutation = `mutation {
                m1: createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id1}" targetID: "${id2}"}) { id }
                m2: createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id1}" targetID: "${id3}"}) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => null)
                .catch(() => new Error(`@distinct directive should not yield an error when adding two edges to different objects`));
            if(err != null) throw err;
        });

        // This is the case where the distinct directive of an edge is violated when adding an edge
        it('add non-distinct edge should fail', async () => {
            let mutation = `mutation {
                m1: createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id2}" targetID: "${id3}"}) { id }
                m2: createShouldBeDistinctEdgeFromDistinctTest(data:{ sourceID: "${id2}" targetID: "${id3}"}) { id }
            }`;
            let err = await request(url, mutation)
                .then(() => new Error(`@distinct directive should yield an error for when adding an edge to the same object twice`))
                .catch(() => null);
            if(err != null) throw err;
        });
    });

    describe('@noloops tests', () => {
        let id1;
        let id2;
        let id3;

        it('no loops connect', async () => {
            let m = `mutation {
                m1:createNoloopsTest(data:{ testDummyField: 0 }) { id }
                m2:createNoloopsTest(data:{ testDummyField: 0 }) { id }
                m3:createNoloopsTest(data:{ testDummyField: 0 }) { id }
            }`;
            await request(url, m).then((data) => {
                id1 = data.m1.id;
                id2 = data.m2.id;
                id3 = data.m3.id;
            });

            let mutation = `mutation { createNoloopsTest(data:{ possibleLoop: { connect: "${id1}"} }) { id } }`;
            await request(url, mutation)
                .then(() => {})
                .catch(() =>  {
                    throw new Error(`@noloops directive should not yield error when connecting to another object`)
                });
        });

        it('no loops edge', async () => {
            let mutation = `mutation {
                createPossibleLoopEdgeFromNoloopsTest(data: {
                    sourceID: "${id1}"
                    targetID: "${id2}"
                }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch((err) =>  {
                    throw new Error(`@noloops directive should not yield error adding edge between distinct objects`)
                });
        });

        it('loops edge', async () => {
            let mutation = `mutation {
                createPossibleLoopEdgeFromNoloopsTest(data: {
                    sourceID: "${id2}"
                    targetID: "${id2}"
                }) { id }
            }`;
            await request(url, mutation)
                .then(() => {
                    throw new Error(`@noloops directive should yield an error when adding an edge from an object to itself`)
                })
                .catch(() =>  null);
        });

        it('no loops connect list', async () => {
            let mutation = `mutation {
                createNoloopsTest(data:{
                    possibleLoops: [
                        { connect: "${id1}"}
                        { connect: "${id2}"}
                    ]
                }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch((err) =>  {
                    console.log(err);
                    throw new Error(`@noloops directive should not yield error when connecting to other objects`)
                });
        });

        it('no loops edge list', async () => {
            let mutation = `mutation {
                createPossibleLoopsEdgeFromNoloopsTest(data: {
                    sourceID: "${id2}"
                    targetID: "${id1}"
                }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch((err) =>  {
                    console.log(err)
                    throw new Error(`@noloops directive should not yield error when adding edges to other objects`)
                });
        });

        it('loops edge list', async () => {
            let mutation = `mutation {
                createPossibleLoopsEdgeFromNoloopsTest(data: {
                    sourceID: "${id2}"
                    targetID: "${id2}"
                }) { id }
            }`;
            await request(url, mutation)
                .then(() => {
                    throw new Error(`@noloops directive should yield error when adding edges from an object to itself`)
                })
                .catch(() =>  null);
        });
    });

    describe('@requiredForTarget tests', () => {
        let id1;
        let id2;
        let targetId1;
        let edgeId1;
        let edgeId2;

        it('create object and target', async () => {
            let mutation = `mutation {
                createRequiredForTargetTest(data:{ target: { create: { testDummyField: 1 } } }) {
                    id
                    target { id }
                    _outgoingTargetEdgesFromRequiredForTargetTest { id }
                }
            }`;
            await request(url, mutation)
                .then(data => {
                    id1 = data.createRequiredForTargetTest.id;
                    targetId1 = data.createRequiredForTargetTest.target.id;
                    edgeId1 = data.createRequiredForTargetTest._outgoingTargetEdgesFromRequiredForTargetTest.id;
                })
                .catch(() => {
                    throw new Error(`@requiredForTarget directive should not yield an error when creating nested object with requiredForTarget field`);
                });
        });

        it('create object and connectto target', async () => {
            let mutation = `mutation {
                createRequiredForTargetTest(data:{ target: { connect: "${targetId1}" } }) {
                    id
                    _outgoingTargetEdgesFromRequiredForTargetTest { id }
                }
            }`;
            await request(url, mutation)
                .then((data) => {
                    id2 = data.createRequiredForTargetTest.id;
                    edgeId2 = data.createRequiredForTargetTest._outgoingTargetEdgesFromRequiredForTargetTest.id;
                })
                .catch(() => {
                    throw new Error(`@requiredForTarget directive should not yield an error when connect with requiredForTarget field`);
                });
        });

        it('delete edge connecting to target', async () => {
            // There are two fields connecting to targetId1, mutation should not fail
            let mutation = `mutation {
                deleteTargetEdgeFromRequiredForTargetTest(id: "${edgeId1}") { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch(() => {
                    throw new Error(`@requiredForTarget directive should not yield an error since a requiredForTarget edge still exists`);
                });
        });

        it('delete all edges connecting to target', async () => {
            // No more fields connecting to targetId1, mutation should fail
            let mutation = `mutation {
                deleteTargetEdgeFromRequiredForTargetTest(id: "${edgeId2}") { id }
            }`;
            let result = await request(url, mutation)
                .then(() => new Error(`@requiredForTarget directive should yield an error since no requiredForTarget edge will exist`))
                .catch(() => null);
            if(result){
                throw result;
            }
        });

        it('delete source of edge connecting to target', async () => {
            // No more fields connecting to targetId1, mutation should fail
            let mutation = `mutation {
                deleteRequiredForTargetTest(id: "${id2}") { id }
            }`;
            let result = await request(url, mutation)
                .then(() => new Error(`@requiredForTarget directive should yield an error since the source of edge (and edge) will cease to exist`))
                .catch((err) => null);
            if(result){
                throw result;
            }
        });

        it('create only target', async () => {
            let mutation = `mutation {
                createRequiredForTargetTarget(data:{ }) { id }
            }`;
            let result = await request(url, mutation)
                .then(() => new Error(`@requiredForTarget directive should yield an error when attempting to create objects out of order`))
                .catch(() => null);
            if(result){
                throw result;
            }
        });

        it('create object and target using dependent mutations', async () => {
            let mutation = `mutation($targetId: ID!) {
                createRequiredForTargetTarget(data:{ }) { id @export(as:"targetId") }
                createRequiredForTargetTest(data:{ target: { connect: $targetId } }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch(() => {
                    throw new Error(`@requiredForTarget directive should not yield an error when creating objects using dependent mutations`);
                });
        });
    });

    describe("@uniqueForTarget tests", () => {
        let targetId1;
        let targetId2;
        let targetId3;

        it('create object and target', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{ target: { create: { testDummyField: 0 } } }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch(() => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when creating a nested target object`);
                });
        });

        it('create targets', async () => {
            let mutation = `mutation {
                m1: createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id }
                m2: createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id }
                m3: createUniqueForTargetTarget(data:{ testDummyField: 0 }) { id }
            }`;
            await request(url, mutation)
                .then((data) => {
                    targetId1 = data.m1.id;
                    targetId2 = data.m2.id;
                    targetId3 = data.m3.id;
                })
                .catch(() => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when creating the target object`);
                });
        });

        it('create object and connect to target', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{ target: { connect: "${targetId1}"} }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch(() => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when creating a unique object connecting to the target object`);
                });
        });

        it('connect two objects to same target', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{ target: { connect: "${targetId1}"} }) { id }
            }`;
            await request(url, mutation)
                .then(() => {
                    throw new Error(`@uniqueForTarget directive should yield an error when connecting a second object a target object`);
                })
                .catch(() => {});
        });

        it('create object with list create', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{
                targets: [
                    { create: { testDummyField: 0 } }
                    { create: { testDummyField: 0 } }
                ] }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch((err) => {
                    console.log(err)
                    throw new Error(`@uniqueForTarget directive should not yield an error when creating multiple nested target object`);
                });
        });

        it('create object with list connect', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{
                targets: [
                    { connect: "${targetId2}" }
                    { connect: "${targetId3}" }
                ] }) { id }
            }`;
            await request(url, mutation)
                .then(() => {})
                .catch((err) => {
                    throw new Error(`@uniqueForTarget directive should not yield an error when connecting multiple nested target object`);
                });
        });

        it('connect two objects to the same targets', async () => {
            let mutation = `mutation {
                createUniqueForTargetTest(data:{
                targets: [
                    { connect: "${targetId2}" }
                    { connect: "${targetId3}" }
                ] }) { id }
            }`;
            await request(url, mutation)
                .then(() => {
                    throw new Error(`@uniqueForTarget directive should yield an error when connecting two objects to the same targets`);
                })
                .catch(() => {});
        });

    });

    after((done) => {
        testServer.server.close(done);
    });
});


