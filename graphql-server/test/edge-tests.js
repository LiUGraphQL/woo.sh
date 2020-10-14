const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const { makeServer } = require('../server');
const { request, gql } = require('graphql-request');
const { readFileSync } = require('fs');

// Schema before API generation
let baseSchema = readFileSync('./test/resources/starwars-api.graphql', 'utf8'); // relative to root
let resolvers = require('./resources/starwars-resolvers.js'); // relative to test file

let testServer;
let url;

describe('# edge tests', () => {
    let droidId;
    let humanId;
    let humanId2;
    let starshipId;
    let edgeId;

    before((done) => {
        let options = {
            baseSchema,
            resolvers,
            'driver': 'arangodb',
            'dbName': 'starwars-db',
            'dbUrl': 'http://localhost:8529',
            'drop': true,
            'disableDirectivesChecking': true,
            'disableEdgeValidation': false,
            'debug': false
        };

        makeServer(options).then(server => {
            server.listen(4001, done).then(server => {
                testServer = server;
                url = server.url;
            });
        });
    });

    it('create edge between types', async () => {
        let mutation = `mutation {
            createDroid(data: { name: "C-3PO", appearsIn: [NEWHOPE, EMPIRE, JEDI] }){ id }
            human1:createHuman(data: { name: "Luke Skywalker", appearsIn: [NEWHOPE, EMPIRE, JEDI] }){ id }
            human2:createHuman(data: { name: "Han Solo", appearsIn: [NEWHOPE, EMPIRE, JEDI] }){ id }
            createStarship(data: { name: "Millennium Falcon" }){ id }
        }`;

        await request(url, mutation).then((data) => {
            droidId = data.createDroid.id;
            humanId = data.human1.id;
            humanId2 = data.human2.id;
            starshipId = data.createStarship.id;
        });

        let mutation2 = `mutation {
            createStarshipsEdgeFromHuman(data: { sourceID: "${humanId}", targetID:"${starshipId}" }){
                id
                source { id name }
                target { id name }
            }
        }`;
        await request(url, mutation2).then((data) => {
            edgeId = data.createStarshipsEdgeFromHuman.id;
            let sourceID = data.createStarshipsEdgeFromHuman.source.id;
            let sourceName = data.createStarshipsEdgeFromHuman.source.name;
            let targetID = data.createStarshipsEdgeFromHuman.target.id;
            let targetName = data.createStarshipsEdgeFromHuman.target.name;
            expect(sourceID).to.be.eq(humanId);
            expect(sourceName).to.be.eq("Luke Skywalker");
            expect(targetID).to.be.eq(starshipId);
            expect(targetName).to.be.eq("Millennium Falcon");
        });
    });

    it('query edge by id', (done) => {
        let query = `query { _StarshipsEdgeFromHuman(id: "${edgeId}"){
                source { id name }
                target { id name }
            }
        }`;
        request(url, query).then((data) => {
            let sourceID = data._StarshipsEdgeFromHuman.source.id;
            let sourceName = data._StarshipsEdgeFromHuman.source.name;
            let targetID = data._StarshipsEdgeFromHuman.target.id;
            let targetName = data._StarshipsEdgeFromHuman.target.name;
            expect(sourceID).to.be.eq(humanId);
            expect(sourceName).to.be.eq("Luke Skywalker");
            expect(targetID).to.be.eq(starshipId);
            expect(targetName).to.be.eq("Millennium Falcon");
            done();
        }).catch(err => done(err));
    });

    it('create annotated edge between types', (done) => {
        let mutation = `mutation {
            createStarshipsEdgeFromHuman(data: { sourceID: "${humanId}", targetID:"${starshipId}", annotations: { owner: false } }){
                id
                source { id name }
                target { id name }
                owner
            }
        }`;
        request(url, mutation).then((data) => {
            let owner = data.createStarshipsEdgeFromHuman.owner;
            let sourceID = data.createStarshipsEdgeFromHuman.source.id;
            let sourceName = data.createStarshipsEdgeFromHuman.source.name;
            let targetID = data.createStarshipsEdgeFromHuman.target.id;
            let targetName = data.createStarshipsEdgeFromHuman.target.name;
            expect(owner).to.be.false;
            expect(sourceID).to.be.eq(humanId);
            expect(sourceName).to.be.eq("Luke Skywalker");
            expect(targetID).to.be.eq(starshipId);
            expect(targetName).to.be.eq("Millennium Falcon");
            done();
        }).catch(err => done(err));
    });

    it('create edge between illegal types', (done) => {
        let mutation = `mutation {
            createStarshipsEdgeFromHuman(data: { sourceID: "${humanId}", targetID:"${droidId}" }){ id }
        }`;
        request(url, mutation).then(() => {
            done(new Error('Failed to detect duplicate key'));
        }).catch(() => { done() });
    });

    it('create edge between type and interface', (done) => {
        let mutation = `mutation {
            m1:createFriendsEdgeFromHuman(data: { sourceID: "${humanId}", targetID:"${droidId}" }){
                source { id }
                target { id }
            }
            m2:createFriendsEdgeFromHuman(data: { sourceID: "${humanId}", targetID:"${humanId2}" }){
                source { id }
                target { id }
            }
        }`;
        request(url, mutation).then((data) => {
            let human1 = data.m1.source.id;
            let droid = data.m1.target.id;
            let human2 = data.m2.source.id;
            let human3 = data.m2.target.id;
            expect(human1).to.be.eq(humanId);
            expect(droid).to.be.eq(droid);
            expect(human2).to.be.eq(humanId);
            expect(human3).to.be.eq(humanId2);
            done();
        });
    });

    it('create edge between type and illegal interface', (done) => {
        let mutation = `mutation {
            createStarshipsEdgeFromHuman(data: { sourceID: "${humanId}", targetID:"${humanId}" }){ id }
        }`;
        request(url, mutation).then(() => {
            done(new Error('Failed to detect illegal union'));
        }).catch(() => { done() });
    });

    it('create annotated edge between type and interface', (done) => {
        let mutation = `mutation {
            createFriendsEdgeFromHuman(data: { sourceID: "${humanId}", targetID:"${droidId}", annotations: { description: "Good friends" } }){
                source { id }
                target { id }
                description
            }
        }`;
        request(url, mutation).then((data) => {
            let source = data.createFriendsEdgeFromHuman.source.id;
            let droid = data.createFriendsEdgeFromHuman.target.id;
            let description = data.createFriendsEdgeFromHuman.description;
            expect(source).to.be.eq(humanId);
            expect(droid).to.be.eq(droid);
            expect(description).to.be.eq("Good friends");
            done();
        });
    });

    let reviewId;

    it('create edge between type and union', async () => {
        let mutation = `mutation {
            createReview(data: {
                episode: NEWHOPE,
                stars: 5,
                mentions: [ { connect: "${humanId}"} ]
            }){ id }
        }`;
        await request(url, mutation).then((data) => {
            reviewId = data.createReview.id;
        });
        let mutation2 = `mutation {
            createMentionsEdgeFromReview(data: {
                sourceID: "${reviewId}",
                targetID: "${droidId}"
            }){
                id
                source { id }
                target {
                    ... on Human { id }
                    ... on Droid { id }
                    ... on Starship { id }
                }
            }
        }`;
        await request(url, mutation2).then((data) => {
            let id  = data.createMentionsEdgeFromReview.target.id;
            expect(id).to.be.eq(droidId);
        });
    });

    it('create edge between type and illegal union', (done) => {
        let mutation = `mutation {
            createMentionsEdgeFromReview(data: {
                sourceID: "${reviewId}",
                targetID:"${reviewId}"
             }){ id }
        }`;
        request(url, mutation).then(() => {
            done(new Error('Failed to detect illegal union'));
        }).catch(() => done());
    });

    it('create annotated edge between type and union', (done) => {
        let mutation = `mutation {
            createMentionsEdgeFromReview(data: { sourceID: "${reviewId}", targetID:"${droidId}", annotations: { important: true } }){
                source { id }
                target {
                    ... on Human { id }
                    ... on Droid { id }
                    ... on Starship { id }
                }
                important
            }
        }`;
        request(url, mutation).then((data) => {
            let source  = data.createMentionsEdgeFromReview.source.id;
            let target  = data.createMentionsEdgeFromReview.target.id;
            let important  = data.createMentionsEdgeFromReview.important;
            expect(source).to.be.eq(reviewId);
            expect(target).to.be.eq(droidId);
            expect(important).to.be.true;
            done();
        });
    });

    it('update edge', (done) => {
        let mutation = `mutation {
            updateStarshipsEdgeFromHuman(id: "${edgeId}", data: { owner: true }){
                source { id }
                target { id }
                owner
            }
        }`;
        request(url, mutation).then((data) => {
            let owner = data.updateStarshipsEdgeFromHuman.owner;
            expect(owner).to.be.true;
            done();
        });
    });

    it('delete edge', async () => {
        let mutation = `mutation { deleteStarshipsEdgeFromHuman(id: "${edgeId}"){ id } }`;
        await request(url, mutation).then((data) => {});

        let query = `query { _StarshipsEdgeFromHuman(id: "${edgeId}"){ id source { id } } }`;
        await request(url, query).then((data) => {
            expect(data._StarshipsEdgeFromHuman).to.be.eq(null);
        });
    });

    it('delete source of edge', async () => {
        let edgeId;
        let sourceId;
        let targetId;

        let mutation = `mutation {
            createHuman(data: {
                name: "John Doe"
                appearsIn: []
                friends: [{ createHuman: { name: "Jane Doe" appearsIn: [] } }]
            }){
                id
                _outgoingFriendsEdgesFromHuman { id target { id } }
            }
        }`;

        await request(url, mutation).then((data) => {
            edgeId = data.createHuman._outgoingFriendsEdgesFromHuman[0].id;
            sourceId = data.createHuman.id;
            targetId = data.createHuman._outgoingFriendsEdgesFromHuman[0].target.id;
        });

        let getEdge = `query { _FriendsEdgeFromHuman(id:"${edgeId}"){ id } }`;
        await request(url, getEdge).then((data) => expect(data._FriendsEdgeFromHuman).to.be.not.eq(null));

        let reverseEdge = `query { human(id:"${targetId}"){ id _friendsFromHuman { id } } }`;
        await request(url, reverseEdge).then((data) => expect(data.human._friendsFromHuman[0].id).to.be.eq(sourceId));

        let deleteMutation = `mutation { deleteHuman(id:"${sourceId}"){ id } }`;
        await request(url, deleteMutation).then(() => {});

        // after delete source
        await request(url, getEdge).then((data) => expect(data._FriendsEdgeFromHuman).to.be.eq(null));
        await request(url, reverseEdge).then((data) => expect(data.human._friendsFromHuman.length).to.be.eq(0));
    });

    it('delete target of edge', async () => {
        let edgeId;
        let sourceId;
        let targetId;

        let mutation = `mutation {
            createHuman(data: {
                name: "Simon Doe"
                appearsIn: []
                friends: [{ createHuman: { name: "Jenny Doe" appearsIn: [] } }]
            }){
                id
                _outgoingFriendsEdgesFromHuman { id target { id } }
            }
        }`;

        await request(url, mutation).then((data) => {
            edgeId = data.createHuman._outgoingFriendsEdgesFromHuman[0].id;
            sourceId = data.createHuman.id;
            targetId = data.createHuman._outgoingFriendsEdgesFromHuman[0].target.id;
        });

        let getEdge = `query { _FriendsEdgeFromHuman(id:"${edgeId}"){ id } }`;
        await request(url, getEdge).then((data) => expect(data._FriendsEdgeFromHuman).to.be.not.eq(null));

        let reverseEdge = `query { human(id:"${sourceId}"){ id friends { id } } }`;
        await request(url, reverseEdge).then((data) => expect(data.human.friends[0].id).to.be.eq(targetId));

        let deleteMutation = `mutation { deleteHuman(id:"${targetId}"){ id } }`;
        await request(url, deleteMutation).then(() => {});

        // after delete source
        await request(url, getEdge).then((data) => expect(data._FriendsEdgeFromHuman).to.be.eq(null));
        await request(url, reverseEdge).then((data) => expect(data.human.friends.length).to.be.eq(0));
    });

    after((done) => {
        testServer.server.close(done);
    });
});
