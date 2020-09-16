/**
 * This class is meant as basic functionality/integration test to find obvious errors in the generated
 * resolvers, schema, or backend code. Basically, it's originally meant as something of a functionality + sanity check.
 *
 * What it does:
 * For each GraphQL type, a random object input object is created. Nested input objects are created to a configurable
 * depth. After level 3, only required fields are included in the generated inputs. For every created object, the
 * object is retrieved with all possible subfields down to a configurable level based on its ID. Then the all fields
 * are updated in the same way as an object is created. Finally, for all types, a list objects is retrieved with all
 * possible subfields down to a configurable level. A simple equality filter is added for the ID of the type.
 *
 *
 * What it does NOT do:
 * - Does not verify that the returned object matches the expected result. (TODO)
 * - Executes no queries over annotated edges (TODO)
 * - Executes no mutations to annotate edges (TODO).
 * - Care about / check directives (Requires process.env.DISABLE_DIRECTIVES_CHECKING to be set to true if directives are used) (TODO).
 * - ... a lot of other things probably.
 */

const { InMemoryCache } = require('apollo-cache-inmemory')
const { ApolloClient } = require('apollo-client');
const { HttpLink } = require('apollo-link-http');
const gql = require('graphql-tag');
const { introspectSchema } = require('graphql-tools');
const fetch = require('node-fetch');
const { isObjectType } = require('graphql');
const tools = require('./generation-tools.js');

/**
 * The transaction tests requires the database to be empty prior to testing.
 */
async function transactionTest() {
    // connect
    let uri = 'http://localhost:4000';
    let {client, schema} = await connect(uri);

    // attempt to create objects but trigger an exception

    // verify that not
}

async function run() {
    // connect client to server
    let uri = 'http://localhost:4000';
    let {client, schema} = await connect(uri);
    tools.setSeed(new Date().valueOf());

    // iterate type schema
    for(let i in schema._typeMap){
        let t = schema._typeMap[i];
        if(!isObjectType(t) || i == 'Query' || i == 'Mutation' || i.startsWith('_') || i.includes('EdgeFrom')) continue;

        // mutations to create
        let inputToCreate = tools.makeInputToCreate(t, schema, 6, false);
        let createArg = tools.jsonToGraphQL(inputToCreate);
        let create = `
           mutation {
              create${t.name}(data:${createArg}) {
                 id
              }
           }
        `;
        console.log(`Mutations:\tcreate${t.name}`);

        const m1 = await client.mutate({ mutation: gql`${create}` });
        if(m1.errors){
            console.error(m1.errors);
        }

        // query to get by ID
        let subfields = tools.getSubFields(t, 3);
        let id = m1.data[`create${t.name}`].id;
        let n = `${t.name[0].toLowerCase() + t.name.substr(1)}`;
        let get = `
           query {
              ${n}(id: "${id}")
              ${subfields}
           }
        `;
        console.log(`Query:\t\t${t.name[0].toLowerCase() + t.name.substr(1)} (ID=${id})`);
        const q1 = await client.query({ query: gql`${get}` });
        if(q1.errors){
            console.error(q1.errors);
        }

        // update fields, create a new object and write over the values
        let inputToUpdate = tools.makeInputToCreate(t, schema, 7, false);
        let updateArg = tools.jsonToGraphQL(inputToUpdate);
        let mutation2 = `
            mutation {
                update${t.name}(id: "${id}", data:${updateArg}) {
                    id
                }
            }
        `;
        console.log(`Mutation:\tupdate${t.name} (id=${id})`);
        const m2 = await client.mutate({mutation: gql`${mutation2}`});
        if (m2.errors) {
            console.error(m2.errors);
        }

        // query list of type
        subfields = tools.getSubFields(t, 3);
        let getList = `
           query {
              listOf${t.name}s(first: 7, after: "", filter: { id: { _neq: "" } }) { 
                 isEndOfWholeList
                 totalCount
                 content
                 ${subfields}
              }
           }
        `;

        console.log(`Query:\t\tlistOf${t.name}s`);
        const q2 = await client.query({ query: gql`${getList}` });
        let totalCount = q2.data[`listOf${t.name}s`].totalCount;
        if(q2.errors){
            console.error(q2.errors);
        }
    }
}

async function connect(uri){
    const httpLink = new HttpLink({ uri: uri, fetch });
    const client = new ApolloClient({ link: httpLink, cache: new InMemoryCache() });
    const schema = await introspectSchema(httpLink); // parse remote schema
    return { client: client, schema: schema };
}

run().then(() => {
    console.log("Client tests passed.");
    let exitAfterClientTests = process.env.EXIT_AFTER_CLIENT_TESTS === 'true';
    if(exitAfterClientTests) process.exit(0);
}).catch(reason => {
    let exitAfterClientTests = process.env.EXIT_AFTER_CLIENT_TESTS === 'true';
    // Not the nicest way to exit, but it works for testing.
    console.error(reason);
    console.error("Client tests did NOT pass.");
    if(exitAfterClientTests) process.exit(1);
});
