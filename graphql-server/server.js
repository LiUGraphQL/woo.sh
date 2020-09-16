const { ApolloServer, gql } = require('apollo-server');

async function makeServer(options){
    // Activate/deactivate debug mode
    if(!options.debug) console.debug = function() {};

    // Init driver
    const driver = require(`./drivers/${options.driver}/driver.js`);
    await driver.init(options);

    // Load resolvers
    const resolvers = require(options.resolvers).get({ driver });
    const customResolvers = require(options.customResolvers).get({ driver });

    // Create instance of server
    const server = new ApolloServer({
        'typeDefs': gql`${options.baseSchema} ${options.customSchema}`,
        'resolvers': [ resolvers, customResolvers ]
    });

    // Return server
    return server;
}

module.exports = { makeServer };
