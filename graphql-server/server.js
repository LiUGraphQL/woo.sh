const { ApolloServer, gql } = require('apollo-server');
const { readFileSync } = require('fs');
const driver = require('./driver.js');
const graphqlResolvers = require('./resolvers.js');
const graphqlCustomResolvers = require('./custom-resolvers.js');

async function run(){
    // parse API schema and extended schema
    const baseSchema = readFileSync('api-schema/api-schema.graphql', 'utf8');
    const customSchema = readFileSync('api-schema/custom-api-schema.graphql', 'utf8');
    const typeDefs = gql`${baseSchema} ${customSchema}`;

    // Enable/disable debugging
    if(process.env.DEBUG !== 'true'){
        console.debug = function() {};
    }

    // Driver options
    // Use environment variables to customize settings when starting the server
    let args = {
        'typeDefs': gql`${baseSchema}`,
        'db_name': process.env.DB_NAME || 'spirit-db',
        'url': process.env.URL || 'http://localhost:8529',
        'drop': process.env.DROP === 'true',
        'disableEdgeValidation': process.env.DISABLE_EDGE_VALIDATION === 'true'
    };
    await driver.init(args);

    // Load base resolvers
    const resolvers = await graphqlResolvers.get({
        driver: driver
    });
    // Load custom resolvers
    // Configure the get-request below if your custom resolvers require additional options
    const customResolvers = await graphqlCustomResolvers.get({
        driver: driver
    });

    // Create instance of server and start listening
    const server = new ApolloServer({
        'typeDefs': typeDefs,
        'resolvers': [
            resolvers,
            customResolvers
        ]
    });
    server.listen().then(({ url }) => {
        console.log(`GraphQL service ready at: ${url}`);
    });
}

// Run server
run().then(() => { err => console.error(err); });
