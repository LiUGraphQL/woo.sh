const { makeServer } = require('./server');
const { readFileSync } = require('fs');
require('dotenv').config();

const baseSchema = readFileSync(process.env.API_SCHEMA || './resources/api-schema.graphql', 'utf8');
const customSchema = readFileSync(process.env.CUSTOM_API_SCHEMA || './resources/custom-api-schema.graphql', 'utf8');
const resolvers = require(process.env.RESOLVERS || './resources/resolvers.js', 'utf8');
const customResolvers = require(process.env.CUSTOM_RESOLVERS || './resources/custom-resolvers.js', 'utf8');

let options = {
    baseSchema,
    customSchema,
    resolvers,
    customResolvers,
    'driver': process.env.DRIVER || 'arangodb',
    'dbName': process.env.DB_NAME || 'dev-db',
    'dbUrl': process.env.DB_URL || 'http://localhost:8529',
    'drop': process.env.DROP === 'true',
    'disableDirectivesChecking': process.env.DISABLE_DIRECTIVES_CHECKING === 'true',
    'disableEdgeValidation': process.env.DISABLE_EDGE_VALIDATION === 'true',
    'debug': process.env.DEBUG === 'true'
};

makeServer(options).then( server => {
    server.listen().then(({ url }) => {
        console.log('\x1b[33m%s\x1b[0m', `GraphQL server is running at ${url}`);
    });
});
