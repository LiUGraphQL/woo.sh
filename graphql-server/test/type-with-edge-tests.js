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

describe('# type with edge tests', () => {
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
    let humanId2;
    let starshipId;

    it('create type with edge', (done) => {
        let mutation = `mutation {
            createHuman(data: {
                name: "Han Solo",
                appearsIn: [NEWHOPE, EMPIRE, JEDI]
                starships: [ { create: { name: "Millennium Falcon" } } ]
            }){ id starships { id name } }
        }`;

        request(url, mutation).then((data) => {
            humanId = data.createHuman.id;
            let starship = data.createHuman.starships[0].name;
            starshipId = data.createHuman.starships[0].id;
            expect(starship).to.be.eq("Millennium Falcon");
            done();
        }).catch(err => done(err));
    });

    it('query type with edge by ID', (done) => {
        let query = `query { human(id: "${humanId}"){ starships { name } } }`;
        request(url, query).then((data) => {
            let starship = data.human.starships[0].name;
            expect(starship).to.be.equal("Millennium Falcon");
            done();
        }).catch(err => done(err));
    });

    it('query type with edge by key', (done) => {
        let query = `query { humanByKey(key: { name: "Han Solo" } ){ id starships { name } } }`;
        request(url, query).then((data) => {
            let id = data.humanByKey.id;
            let starship = data.humanByKey.starships[0].name;
            expect(id).to.be.equal(humanId);
            expect(starship).to.be.equal("Millennium Falcon");
            done();
        }).catch(err => done(err));
    });

    it('create type with edge with duplicate key', (done) => {
        let mutation = `mutation {
            createHuman(data: {
                name: "Luke Skywalker",
                appearsIn: [NEWHOPE, EMPIRE, JEDI]
                starship: { createStarship: { name: "Millennium Falcon" } } ]
            }){ id friends { name } }
        }`;
        request(url, mutation).then(() => {
            done(new Error('Failed to detect duplicate key in edge'));
        }).catch(() => done());
    });

    it('create type with edge connect', (done) => {
        let mutation = `mutation {
            createHuman(data: {
                name: "Luke Skywalker",
                appearsIn: [NEWHOPE, EMPIRE, JEDI]
                starships: [ { connect: "${starshipId}" } ]
            }){ id starships { id } }
        }`;
        request(url, mutation).then((data) => {
            humanId2 = data.createHuman.id;
            let id = data.createHuman.starships[0].id;
            expect(id).to.be.equal(starshipId);
            done();
        }).catch(err => done(err));
    });

    it('create type with illegal edge connect', (done) => {
        let mutation = `mutation {
            createHuman(data: {
                name: "Princess Leia",
                appearsIn: [NEWHOPE, EMPIRE, JEDI]
                starships: [ { connect: "${humanId}" } ]
            }){ id starship { id } }
        }`;
        request(url, mutation).then(() => {
            done(new Error('Failed to detect illegal type in edge'));
        }).catch(() => done());
    });

    it('query type with filtered edge', async () => {
        let query = `query {
            human(id:"${humanId}"){
                starships(filter: { name: { _ilike: "M%" }}) { name }
            }
        }`;
        await request(url, query).then((data) => {
            let starship = data.human.starships[0].name;
            expect(starship).to.be.equal("Millennium Falcon");
        });
        query = `query {
            human(id:"${humanId}"){
                starships(filter: { name: { _ilike: "X%" }}) { name }
            }
        }`;
        await request(url, query).then((data) => {
            expect(data.human.starships).to.be.empty;
        });
    });

    it('query type with reverse edge', (done) => {
        let query = `query { starship(id: "${starshipId}" ){ _starshipsFromHuman { id } } }`;
        request(url, query).then((data) => {
            let humans = new Set(data.starship._starshipsFromHuman.map(x => x.id));
            expect(humans).to.be.deep.equal(new Set([humanId, humanId2]));
            done();
        }).catch(err => done(err));
    });

    after((done) => {
        testServer.server.close(done);
    });
});
