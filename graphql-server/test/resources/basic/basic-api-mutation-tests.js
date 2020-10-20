// This file contains for basic operations on a single type, i.e., create, update, delete, and get by id.

const chai = require('chai');
const expect = chai.expect;
const { makeServer } = require('../../../server');
const { request, gql } = require('graphql-request');
const { readFileSync } = require('fs');

// Schema before API generation
let baseSchema = readFileSync('./test/resources/basic-api-schema.graphql', 'utf8'); // relative to root
let resolvers = require('./basic-resolvers.js'); // relative to test file

let testServer;
let url;

describe('Basic API tests', () => {
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

        makeServer(options).then(server => {
            server.listen(4000, done).then(server => {
                testServer = server;
                url = server.url;
            });
        });
    });


    describe('Mutations', () => {
        let personId;
        it('#create', (done) => {
            let query = `
            mutation {
                createPerson(data: { name: "John Doe", gender: MALE }){ id name gender }
            }`;
            request(url, query).then((data) => {
                let person = data['createPerson'];
                expect(person.id).to.not.be.null;
                expect(person.name).to.equal('John Doe');
                expect(person.gender).to.equal('MALE');
                personId = person.id;
                let query = `
                query {
                    person(id: "${personId}"){ id name gender }
                }`;
                request(url, query).then((data) => {
                    let person = data['person'];
                    expect(person.id).to.equal(personId);
                    expect(person.name).to.equal('John Doe');
                    expect(person.gender).to.equal('MALE');
                    done();
                });
            });
        });

        it('#update', (done) => {
            let query = `
                mutation {
                    updatePerson(id: "${personId}", data: { name: "Jane Doe", gender: FEMALE }){ id name gender }
                }`;
            request(url, query).then((data) => {
                let person = data['updatePerson'];
                expect(person.id).to.equal(personId);
                expect(person.name).to.equal('Jane Doe');
                expect(person.gender).to.equal('FEMALE');
                let query = `
                query {
                    person(id: "${personId}"){ id  name gender }
                }`;
                request(url, query).then((data) => {
                    let person = data['person'];
                    expect(person.id).to.equal(personId);
                    expect(person.name).to.equal('Jane Doe');
                    expect(person.gender).to.equal('FEMALE');
                    done();
                });
            });
        });

        it('#delete', (done) => {
            let query = `
            mutation {
                deletePerson(id: "${personId}"){ id }
            }`;
            request(url, query).then((data) => {
                let person = data['deletePerson'];
                expect(person.id).to.equal(personId);
                let query = `
                query {
                    person(id: "${personId}"){ id name gender }
                }`;
                request(url, query).then((data) => {
                    let person = data['person'];
                    expect(person).to.be.null;
                    done();
                });
            });
        });

        it('#create with nested edges', (done) => {
            let query = `
                mutation {
                  createPerson(data: {
                    name: "John Doe",
                    gender: MALE,
                    children: [
                      { create: { name:"Jane Doe", gender:FEMALE } },
                      { create: { name: "Johnny Doe", gender:MALE } }
                    ]
                  }){ id children { name } }
                }`;
            request(url, query).then((data) => {
                let person = data['createPerson'];
                expect(new Set(person.children)).to.deep.equal(new Set([{name: 'Jane Doe'}, {name: 'Johnny Doe'}]));
                personId = person.id;
                let query = `
                query {
                    person(id: "${personId}"){ children { name } }
                }`;
                request(url, query).then((data) => {
                    let person = data['person'];
                    expect(new Set(person.children)).to.deep.equal(new Set([{name: 'Jane Doe'}, {name: 'Johnny Doe'}]));
                    done();
                });
            });
        });

        it('#create with connect edges', (done) => {
            let query = `
            mutation {
              createPerson(data: {
                name: "Mary Doe",
                gender: FEMALE,
                children: [
                  { connect: "${personId}" },
                ]
              }){ id children { id } }
            }`;
            request(url, query).then((data) => {
                let person = data['createPerson'];
                expect(new Set(person.children)).to.deep.equal(new Set([{id: personId}]));
                let query = `
                query {
                    person(id: "${person.id}"){ children { id } }
                }`;
                request(url, query).then((data) => {
                    let person = data['person'];
                    expect(new Set(person.children)).to.deep.equal(new Set([{id: personId}]));
                    done();
                });
            });
        });
    });

    after((done) => {
        testServer.server.close(done);
    });
});
