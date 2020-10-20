// This file contains basic tests to verify the basic server functionality.

const chai = require('chai');
const expect = chai.expect;
const { makeServer } = require('../server');
const { request, gql } = require('graphql-request');

let baseSchema = `
    type Query {
        helloWorld(isNull: Boolean): String
        helloWorldList(isNull: Boolean): [String]
    }
`;

let resolvers = {
    get: (options) => {
        return {
            Query: {
                helloWorld: (parent, args) => args.isNull ? null : 'Hello world!',
                helloWorldList: (parent, args) => args.isNull ? null : ['Hello world!', 'Hello world!', 'Hello world!'],
            }
        }
    }
}

// Start server

let testServer;
let url;

describe('# basic server tests', () => {
    it('server should start without exceptions', (done) => {
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

        console.info = function () {};
        makeServer(options).then(server => {
            server.listen(4001, done).then(server => {
                testServer = server;
                url = server.url;
            });
        });
    });

    it('helloWorld should return "Hello world!"', (done) => {
        const query = gql`query { helloWorld }`;
        request(url, query).then((data) => {
            expect(data['helloWorld']).to.equal('Hello world!');
            done();
        });
    });

    it('helloWorld(isNull: true) should return "null"', (done) => {
        const query = gql`query { helloWorld(isNull: true) }`;
        request(url, query).then((data) => {
            expect(data['helloWorld']).to.equal(null);
            done();
        });
    });

    it('helloWorldList should return ["Hello world!", "Hello world!", "Hello world!"]', (done) => {
        const query = gql`query { helloWorldList }`;
        request(url, query).then((data) => {
            expect(data['helloWorldList']).to.deep.equal(['Hello world!', 'Hello world!', 'Hello world!']);
            done();
        });
    });

    it('helloWorld(isNull: true) should return "null"', (done) => {
        const query = gql`query { helloWorldList(isNull: true) }`;
        request(url, query).then((data) => {
            expect(data['helloWorldList']).to.equal(null);
            done();
        });
    });

    it('server should stop without exceptions', (done) => {
        testServer.server.close(done);
    });
});
