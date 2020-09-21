// This file contains for basic operations on a single type, i.e., create, update, delete, and get by id.

const chai = require('chai');
const expect = chai.expect;
const { makeServer } = require('../server');
const { request, gql } = require('graphql-request');
const { readFileSync } = require('fs');

// Schema before API generation
let baseSchema = readFileSync('./test/resources/basic-api-schema.graphql', 'utf8'); // relative to root
let resolvers = require('./resources/basic-resolvers.js'); // relative to test file

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


    describe('Queries', () => {
        let personId;
        it('#add 5 persons', (done) => {
            // Add five persons
            let query = `
            mutation {
                p1:createPerson(data: { name: "John Doe", gender: MALE }){ id },
                p2:createPerson(data: { name: "Jane Doe", gender: FEMALE }){ id },
                p3:createPerson(data: { name: "Marcus Aurelius", gender: MALE }){ id },
                p4:createPerson(data: { name: "Martha Stewart", gender: FEMALE }){ id },
                p5:createPerson(data: { name: "Martha Stewart", gender: MALE }){ id },
            }`;
            request(url, query).then((data) => {
                personId = data.p1.id;
                done();
            });
        });

        it('#get by id', (done) => {
            // Add five persons
            let query = `query {
                    person(id: "${personId}"){ id name }
                }`;
            request(url, query).then((data) => {
                let name = data.person.name;
                expect(name).to.be.equal("John Doe");
                done();
            });
        });


        it('#get list of', (done) => {
            let query = `
            query {
              listOfPersons {
                totalCount
                isEndOfWholeList
                content {
                    name
                    gender
                }
              }
            }`;
            request(url, query).then((data) => {
                expect(data.listOfPersons.totalCount).to.be.eq(5);
                expect(data.listOfPersons.isEndOfWholeList).to.be.eq(true);
                let s = new Set([
                    { name: "John Doe", gender: "MALE" },
                    { name: "Jane Doe", gender: "FEMALE" },
                    { name: "Marcus Aurelius", gender: "MALE" },
                    { name: "Martha Stewart", gender: "FEMALE" },
                    { name: "Martha Stewart", gender: "MALE" }
                ]);
                expect(new Set(data.listOfPersons.content)).to.be.deep.eq(s);
                done();
            });
        });

        it('#get list of (limit)', (done) => {
            let query = `
            query {
              listOfPersons(first: 3) {
                totalCount
                isEndOfWholeList
                content { id }
              }
            }`;
            request(url, query).then((data) => {
                expect(data.listOfPersons.totalCount).to.be.eq(5);
                expect(data.listOfPersons.isEndOfWholeList).to.be.eq(false);
                expect(data.listOfPersons.content.length).to.be.deep.eq(3);
                personId = data.listOfPersons.content[2].id;
                done();
            });
        });

        it('#get list of (limit with paging)', (done) => {
            let query = `
            query {
              listOfPersons(first: 3, after: "${personId}") {
                totalCount
                isEndOfWholeList
                content { id }
              }
            }`;
            request(url, query).then((data) => {
                expect(data.listOfPersons.totalCount).to.be.eq(5);
                expect(data.listOfPersons.isEndOfWholeList).to.be.eq(true);
                expect(data.listOfPersons.content.length).to.be.eq(2);
                done();
            });
        });

        it('#get list of (filter)', (done) => {
            let query = `
            query {
              listOfPersons(filter: { name: { _ilike: "%Doe" } }) {
                totalCount
                isEndOfWholeList
                content { name }
              }
            }`;
            let s = new Set([
                { name: "John Doe" },
                { name: "Jane Doe" }
            ]);
            request(url, query).then((data) => {
                expect(data.listOfPersons.totalCount).to.be.eq(2);
                expect(data.listOfPersons.isEndOfWholeList).to.be.eq(true);
                expect(new Set(data.listOfPersons.content)).to.be.deep.eq(s);
                done();
            });
        });

        // Persons child should have a return edge back to parent
        it('#get reverse edge', (done) => {
            // Add person with a child
            let query = `
            mutation {
                createPerson(data: {
                    name: "Mary",
                    gender: FEMALE,
                    children: [ { create: { name: "Bob", gender: MALE } } ]
                }){ id }
            }`;
            request(url, query).then((data) => {
                personId = data.createPerson.id;

                let query = `
                query {
                    person(id:"${personId}"){
                        name
                        children {
                            name
                            _childrenFromPerson {
                                name
                            }
                        }
                    }
                }`;
                request(url, query).then((data) => {
                    let name1 = data.person.name;
                    let name2 = data.person.children[0].name;
                    let name3 = data.person.children[0]._childrenFromPerson[0].name;
                    expect(name1).to.be.eq("Mary");
                    expect(name1).to.be.eq(name3);
                    expect(name2).to.be.eq("Bob");
                    done();
                });
            });
        });
    });

    after((done) => {
        testServer.server.close(done);
    });
});
