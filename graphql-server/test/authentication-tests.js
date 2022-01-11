const chai = require('chai');
const expect = chai.expect;
const { makeServer } = require('../server');
const { request } = require('graphql-request');
const { readFileSync } = require('fs');

// Schema before API generation
let baseSchema = readFileSync('./test/resources/starwars-api.graphql', 'utf8'); // relative to root
let resolvers = require('./resources/starwars-resolvers.js'); // relative to test file

describe('# authentication tests', () => {
    it('unauthorized connection', (done) => {
        let options = {
            baseSchema,
            resolvers,
            'driver': 'arangodb',
            'dbName': 'starwars-db',
            'dbUrl': 'http://localhost:8530',
            'drop': true,
            'disableDirectivesChecking': false,
            'disableEdgeValidation': false,
            'debug': false
        };

        console.info = () => {};
        makeServer(options)
            .then(server => 
                server.listen(4001).then(server => {
                    server.server.close(() => done(new Error('Unauthorized server should not be allowed to connect to database.')))
                })
            )
            .catch(e => {
                expect(e.statusCode).to.equal(401);
                expect(e.response.body.errorMessage).to.equal('not authorized to execute this request');
                done()
            });
    });

    it('wrong password', (done) => {
        let options = {
            baseSchema,
            resolvers,
            'driver': 'arangodb',
            'dbName': 'starwars-db',
            'dbUrl': 'http://localhost:8530',
            'drop': true,
            'disableDirectivesChecking': false,
            'disableEdgeValidation': false,
            'debug': false,
            'username': 'root',
            'passsword': 'wrongpassword'
        };

        console.info = () => {};
        makeServer(options)
            .then(server => 
                server.listen(4001).then(server => {
                    server.server.close(() => done(new Error('Unauthorized server should not be allowed to connect to database.')))
                })
            )
            .catch(e => {
                expect(e.statusCode).to.equal(401);
                expect(e.response.body.errorMessage).to.equal('not authorized to execute this request');
                done()
            });
    });

    it('wrong username', (done) => {
        let options = {
            baseSchema,
            resolvers,
            'driver': 'arangodb',
            'dbName': 'starwars-db',
            'dbUrl': 'http://localhost:8530',
            'drop': true,
            'disableDirectivesChecking': false,
            'disableEdgeValidation': false,
            'debug': false,
            'username': 'nouser',
            'passsword': 'woosh1234'
        };

        console.info = () => {};
        makeServer(options)
            .then(server => 
                server.listen(4001).then(server => {
                    server.server.close(() => done(new Error('Unauthorized server should not be allowed to connect to database.')))
                })
            )
            .catch(e => {
                expect(e.statusCode).to.equal(401);
                expect(e.response.body.errorMessage).to.equal('not authorized to execute this request');
                done()
            });
    });

    it('authorized', (done) => {
        let options = {
            baseSchema,
            resolvers,
            'driver': 'arangodb',
            'dbName': 'starwars-db',
            'dbUrl': 'http://localhost:8530',
            'drop': true,
            'disableDirectivesChecking': false,
            'disableEdgeValidation': false,
            'debug': false,
            'username': 'root',
            'password': 'woosh1234'
        };

        console.info = () => {};
        makeServer(options)
            .then(server => {
                server.listen(4001)
                    .then(server => {
                        let mutation = `mutation {
                            createDroid(data: { name: "C-3PO", appearsIn: [NEWHOPE, EMPIRE, JEDI] }){ id }
                        }`;
                        request(server.url, mutation).then((data) => {
                            droidId = data.createDroid.id;
                            server.server.close(done())
                        }).catch(err => {
                            server.server.close(done(err))
                        });
                    })
                    .catch(e => () => done(e))
                }
            )
            .catch(e => {
                done(e);
            });
            done();
    });
});


