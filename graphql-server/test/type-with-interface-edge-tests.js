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

describe('# interface tests', () => {
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


    let humanId;
    let starshipId;

    it('create type with interface edge', (done) => {
        let mutation = `mutation {
            createHuman(data: {
                name: "Han Solo",
                appearsIn: [NEWHOPE, EMPIRE, JEDI]
                friends: [ { createHuman: { name: "Luke Skywalker", appearsIn: [NEWHOPE, EMPIRE, JEDI] } } ]
                starships: [ { create: { name: "Millennium Falcon" } } ]
            }){ id friends { id name } starships { id } }
        }`;

        request(url, mutation).then((data) => {
            humanId = data.createHuman.id;
            let name = data.createHuman.friends[0].name;
            starshipId = data.createHuman.starships[0].id;
            expect(name).to.be.eq("Luke Skywalker");
            done();
        }).catch(err => done(err));
    });

    it('query type with interface edge by ID', (done) => {
        let query = `query { human(id: "${humanId}"){ friends { __typename name } } }`;
        request(url, query).then((data) => {
            let name = data.human.friends[0].name;
            let type = data.human.friends[0].__typename;
            expect(name).to.be.equal("Luke Skywalker");
            expect(type).to.be.equal("Human");
            done();
        }).catch(err => done(err));
    });

    it('query type with interface edge by key', (done) => {
        let query = `query { humanByKey(key: { name: "Han Solo" } ){ friends { __typename name } } }`;
        request(url, query).then((data) => {
            let name = data.humanByKey.friends[0].name;
            let type = data.humanByKey.friends[0].__typename;
            expect(name).to.be.equal("Luke Skywalker");
            expect(type).to.be.equal("Human");
            done();
        }).catch(err => done(err));
    });

    it('create type with interface edge with duplicate key', (done) => {
        let mutation = `mutation {
            createHuman(data: {
                name: "Princess Leia",
                appearsIn: [NEWHOPE, EMPIRE, JEDI]
                friends: [{ createHuman: { name: "Luke Skywalker", appearsIn: [NEWHOPE, EMPIRE, JEDI] } } ]
            }){ id friends { name } }
        }`;
        request(url, mutation).then(() => {
            done(new Error('Failed to detect duplicate key in edge'));
        }).catch(() => done());
    });

    it('create type with interface edge connect', (done) => {
        let mutation = `mutation {
            createHuman(data: {
                name: "Princess Leia",
                appearsIn: [NEWHOPE, EMPIRE, JEDI]
                friends: [ { connect: "${humanId}" } ]
            }){ friends { id } }
        }`;
        request(url, mutation).then((data) => {
            let id = data.createHuman.friends[0].id;
            expect(id).to.be.equal(humanId);
            done();
        }).catch(err => done(err));
    });

    it('create type with illegal interface edge connect', (done) => {
        let mutation = `mutation {
            createHuman(data: {
                name: "Obi-Wan Kenobi",
                appearsIn: [NEWHOPE, EMPIRE]
                friends: [ { connect: "${starshipId}" } ]
            }){ id starship { id } }
        }`;
        request(url, mutation).then(() => {
            done(new Error('Failed to detect illegal type in edge'));
        }).catch(() => done());
    });

    it('query type with filtered interface edge', async () => {
        let query = `query {
            human(id:"${humanId}"){
                friends(filter: { name: { _ilike: "L%" }}) { name }
            }
        }`;
        await request(url, query).then((data) => {
            let name = data.human.friends[0].name;
            expect(name).to.be.equal("Luke Skywalker");
        });
        query = `query {
            human(id:"${humanId}"){
                friends(filter: { name: { _ilike: "X%" }}) { name }
            }
        }`;
        await request(url, query).then((data) => {
            expect(data.human.friends).to.be.empty;
        });
    });

    it('query type with reverse interface edge', (done) => {
        let query = `query { human(id: "${humanId}" ){ _friendsFromCharacter { name } } }`;
        request(url, query).then((data) => {
            let name = data.human._friendsFromCharacter[0].name;
            expect(name).to.be.eq('Princess Leia');
            done();
        }).catch(err => done(err));
    });

    after((done) => {
        testServer.server.close(done);
    });
});
