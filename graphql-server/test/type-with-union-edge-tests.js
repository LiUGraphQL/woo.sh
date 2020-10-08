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

describe('# type with union edge tests', () => {
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


    let reviewId;
    let reviewId2;
    let humanId;

    it('create type with union edge', (done) => {
        let mutation = `mutation {
            createReview(data: {
                episode: NEWHOPE,
                stars: 4,
                mentions: [{ createHuman: { name: "Han Solo", appearsIn: [NEWHOPE, EMPIRE, JEDI] } }]
            }){
                id
                mentions {
                    __typename
                    ... on Human {
                        id
                        name
                        appearsIn
                    }
                }
            }
        }`;

        request(url, mutation).then((data) => {
            let typename = data.createReview.mentions[0].__typename;
            let name = data.createReview.mentions[0].name;
            humanId = data.createReview.mentions[0].id;
            reviewId = data.createReview.id;
            expect(typename).to.be.eq("Human");
            expect(name).to.be.eq("Han Solo");
            done();
        }).catch(err => done(err));
    });

    it('query type with union edge by ID', (done) => {
        let query = `query {
            review(id: "${reviewId}"){
                mentions {
                    __typename
                    ... on Human {
                        name
                    }
                }
            }
        }`;
        request(url, query).then((data) => {
            let typename = data.review.mentions[0].__typename;
            let name = data.review.mentions[0].name;
            expect(typename).to.be.eq("Human");
            expect(name).to.be.eq("Han Solo");
            done();
        }).catch(err => done(err));
    });


    it('create type with union edge with duplicate key', (done) => {
        let mutation = `mutation {
            createReview(data: {
                episode: NEWHOPE,
                stars: 4,
                mentions: [{ createHuman: { name: "Han Solo", appearsIn: [NEWHOPE, EMPIRE, JEDI] } }]
            }){
                mentions {
                    __typename
                    ... on Human {
                        name
                    }
                }
            }
        }`;
        request(url, mutation).then(() => {
            done(new Error('Failed to detect duplicate key in edge'));
        }).catch(() => done());
    });

    it('create type with union edge connect', (done) => {
        let mutation = `mutation {
            createReview(data: {
                episode: NEWHOPE,
                stars: 4,
                mentions: [{ connect: "${humanId}" }]
            }){
                id
                mentions {
                    __typename
                    ... on Human {
                        name
                    }
                }
            }
        }`;
        request(url, mutation).then((data) => {
            let name = data.createReview.mentions[0].name;
            reviewId2 = data.createReview.id;
            expect(name).to.be.equal("Han Solo");
            done();
        }).catch(err => done(err));
    });

    it('create type with illegal union edge connect', (done) => {
        let mutation = `mutation {
            createReview(data: {
                episode: NEWHOPE,
                stars: 4,
                mentions: [{ connect: "${reviewId}" }]
            }){ id }
        }`;
        request(url, mutation).then(() => {
            done(new Error('Failed to detect illegal type in edge'));
        }).catch(() => done());
    });

    it('query type with reverse union edge', (done) => {
        let query = `query {
            human(id: "${humanId}" ){
                _mentionsFromReview {
                    id
                    mentions {
                        ... on Human {
                            id
                        }
                    }
                }
            }
        }`;
        request(url, query).then((data) => {
            let ids = data.human._mentionsFromReview.map(x => x.id);
            expect(ids).to.deep.include(reviewId);
            expect(ids).to.deep.include(reviewId2);
            done();
        }).catch(err => done(err));
    });

    after((done) => {
        testServer.server.close(done);
    });
});
