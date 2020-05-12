const { ApolloServer, gql } = require('apollo-server');
const fs = require('fs');
const driver = require('./driver.js');
const graphqlResolvers = require('./resolvers.js');
const graphqlCustomResolvers = require('./custom-resolvers.js');

const text = fs.readFileSync('api-schema/api-schema.graphql', 'utf8');
const textExtend = fs.readFileSync('api-schema/custom-api-schema.graphql', 'utf8');
const typeDefs = gql`${text + textExtend}`;

async function run(){
    // setup resolvers
    const resolvers = await graphqlResolvers.get({ driver: driver });
    const customResolvers = await graphqlCustomResolvers.get({ driver: driver });
    resolvers.Query = {...resolvers.Query, ...customResolvers.Query};

    const server = new ApolloServer({typeDefs, resolvers: resolvers});
    await driver.init(server.schema);

    if(process.env.DISABLE_LOGGING){
        console.info = function() {};
    }

    server.listen().then(({ url }) => {
        console.log(`GraphQL service ready at: ${url}`);
    });
}

function main(){
    run().then(() => {
        err => console.error(err);
    });
}

main();