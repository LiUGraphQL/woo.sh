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

describe('# type tests', () => {
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


    let droidId;
    it('create type', (done) => {
        let mutation = `mutation {
            createDroid(data: { name: "C-3PO", appearsIn: [NEWHOPE, EMPIRE, JEDI] }){ id }
        }`;

        request(url, mutation).then((data) => {
            droidId = data.createDroid.id;
            done();
        }).catch(err => done(err));
    });

    it('query type by id', (done) => {
        let query = `query { droid(id: "${droidId}"){ id name } }`;
        request(url, query).then((data) => {
            let name = data.droid.name;
            expect(name).to.be.equal("C-3PO");
            done();
        }).catch(err => done(err));
    });

    it('query type by key', (done) => {
        let query = `query { droidByKey(key: { name: "C-3PO" } ){ id } }`;
        request(url, query).then((data) => {
            let id = data.droidByKey.id;
            expect(id).to.be.equal(droidId);
            done();
        }).catch(err => done(err));
    });

    it('create type with duplicate key', (done) => {
        let mutation = `mutation { createDroid(data: { name: "C-3PO", appearsIn: [NEWHOPE, EMPIRE, JEDI] }){ id } }`;
        request(url, mutation).then(() => {
            done(new Error('Failed to detect duplicate key'));
        }).catch(() => done());
    });

    it('update type', (done) => {
        let mutation = `mutation { updateDroid(id:"${droidId}", data: { name: "C3PO" }){ name } }`;
        request(url, mutation).then((data) => {
            let name = data.updateDroid.name;
            expect(name).to.be.equal("C3PO");
            done();
        }).catch(err => done(err));
    });

    it('delete type', (done) => {
        let mutation = `mutation { deleteDroid(id:"${droidId}"){ id } }`;
        request(url, mutation).then(() => {
            let query = `query { droid(id: "${droidId}"){ id name } }`;
            request(url, query).then((data) => {
                expect(data.droid).to.be.equal(null);
                done();
            }).catch(err => done(err));
        }).catch(err => done(err));
    });

    it('query list of type', (done) => {
        let mutation = `mutation {\n`;
        let names = ['Obi-Wan Kenobi', 'Han Solo', 'Princess Leia', 'Luke Skywalker', 'Darth Vader'];
        for(let i in names){
            mutation += `m${i}:createHuman(data: { name: "${names[i]}", appearsIn: [NEWHOPE] }){ id }\n`
        }
        mutation += `}`;

        request(url, mutation).then(() => {
            let query = `query { listOfHumans { totalCount isEndOfWholeList content { name } } }`;
            request(url, query).then((data) => {
                expect(data.listOfHumans.totalCount).to.be.eq(5);
                expect(data.listOfHumans.isEndOfWholeList).to.be.true;
                let retrieved = data.listOfHumans.content.map(o => o.name);
                expect(new Set(retrieved)).to.be.deep.equal(new Set(names));
                done();
            }).catch(err => done(err));
        }).catch(err => done(err));
    });

    it('query list of type with paging', async () => {
        let last = '';
        for(let i=0; i<5; i++){
            let query = `query { listOfHumans(first: 1, after:"${last}") { totalCount isEndOfWholeList content { id } } }`
            await request(url, query).then((data) => {
                last =  data.listOfHumans.content[0].id;
                expect(data.listOfHumans.totalCount).to.be.eq(5);
                expect(data.listOfHumans.isEndOfWholeList).to.be.eq(i == 4);
            });
        }
    });

    it('query list of type with string filter', (done) => {
        let query = `query { listOfHumans(filter: { name: { _ilike: "%n%"} }) { totalCount isEndOfWholeList content { name } } }`
        request(url, query).then((data) => {
            expect(data.listOfHumans.totalCount).to.be.eq(3);
            expect(data.listOfHumans.isEndOfWholeList).to.be.true;
            let names = ['Obi-Wan Kenobi', 'Han Solo', 'Princess Leia'];
            let retrieved = data.listOfHumans.content.map(o => o.name);
            expect(new Set(retrieved)).to.be.deep.equal(new Set(names));
            done();
        }).catch(err => done(err));
    });

    after((done) => {
        testServer.server.close(done);
    });
});
