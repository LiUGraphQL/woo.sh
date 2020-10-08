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


    it('query interface by ID', async () => {
        let mutation = `mutation {
            createHuman(data: {
                name: "Han Solo",
                appearsIn: [NEWHOPE, EMPIRE, JEDI],
                friends: [
                    { createHuman: { name: "Princess Leia", appearsIn: [NEWHOPE, EMPIRE, JEDI] } },
                    { createDroid: { name: "R2-D2", appearsIn: [NEWHOPE, EMPIRE, JEDI] } },
                ]
            }){ id }
        }`;

        await request(url, mutation).then((data) => {
            humanId = data.createHuman.id;
        });

        let query = `query { character(id: "${humanId}"){ __typename id } }`;
        await request(url, query).then((data) => {
            let type = data.character.__typename;
            let id = data.character.id;
            expect(type).to.be.eq('Human');
            expect(id).to.be.eq(humanId)
        });
    });

    it('query list of interface', (done) => {
        let query = `query { listOfCharacters { totalCount isEndOfWholeList content { __typename name } } }`;

        request(url, query).then((data) => {
            let totalCount = data.listOfCharacters.totalCount;
            let isEndOfWholeList = data.listOfCharacters.isEndOfWholeList;
            let content = data.listOfCharacters.content;
            expect(totalCount).to.be.eq(3);
            expect(isEndOfWholeList).to.be.true;
            let retrieved = new Set(content);
            expect(retrieved).to.deep.include({ __typename: 'Human', name: 'Han Solo'});
            expect(retrieved).to.deep.include({ __typename: 'Human', name: 'Princess Leia'});
            expect(retrieved).to.deep.include({ __typename: 'Droid', name: 'R2-D2'});
            done();
        }).catch(err => done(err));
    });

    it('query list of interface with paging', async () => {
        let last = '';
        for(let i=0; i<3; i++){
            let query = `query { listOfCharacters(first: 1, after:"${last}") { totalCount isEndOfWholeList content { id } } }`;
            await request(url, query).then((data) => {
                last =  data.listOfCharacters.content[0].id;
                expect(data.listOfCharacters.totalCount).to.be.eq(3);
                expect(data.listOfCharacters.isEndOfWholeList).to.be.eq(i == 2);
            });
        }
    });

    it('query list of interface with string filter', (done) => {
        let query = `query { listOfCharacters(filter: { name: { _ilike: "%r%"} }) { totalCount isEndOfWholeList content { name } } }`
        request(url, query).then((data) => {
            expect(data.listOfCharacters.totalCount).to.be.eq(2);
            expect(data.listOfCharacters.isEndOfWholeList).to.be.true;
            let names = ['Princess Leia', 'R2-D2'];
            let retrieved = data.listOfCharacters.content.map(o => o.name);
            expect(new Set(retrieved)).to.be.deep.equal(new Set(names));
            done();
        }).catch(err => done(err));
    });

    after((done) => {
        testServer.server.close(done);
    });
});
