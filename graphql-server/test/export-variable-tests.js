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

describe('# export variables tests', () => {
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
    let edgeId;

    it('export scalar to create', (done) => {
        let mutation = `mutation($planet: String) {
            human1:createHuman(data: {
                name: "Princess Leia",
                appearsIn: [NEWHOPE, EMPIRE, JEDI],
                homePlanet: "Alderaan"
            }){
                id
                homePlanet @export(as:"planet")
            }
            human2:createHuman(data: {
                name: "Bail Organa",
                appearsIn: [NEWHOPE, EMPIRE, JEDI]
                homePlanet: $planet
            }){
                homePlanet
            }
        }`;

        request(url, mutation).then((data) => {
            humanId = data.human1.id;
            let planet = data.human2.homePlanet;
            expect(planet).to.be.eq("Alderaan");
            done();
        }).catch(err => done(err));
    });

    it('export scalar list to create', (done) => {
        let mutation = `mutation($episodes: [Episode]!) {
            createDroid(data: { name: "C-3PO", appearsIn: [NEWHOPE, EMPIRE, JEDI] }){ id appearsIn @export(as:"episodes")}
            createHuman(data: { name: "Luke Skywalker", appearsIn: $episodes}){
                id
                appearsIn
            }
        }`;

        request(url, mutation).then((data) => {
            let episodes = data.createHuman.appearsIn;
            expect(episodes).to.include("NEWHOPE");
            expect(episodes).to.include("EMPIRE");
            expect(episodes).to.include("JEDI");
            done();
        }).catch(err => done(err));
    });

    it('export ID to connect type', (done) => {
        let mutation = `mutation($starship: ID!) {
            createStarship(data: { name: "Millennium Falcon" }){ id @export(as:"starship")}
            createHuman(data: { name: "Han Solo", appearsIn: [NEWHOPE, EMPIRE, JEDI], starships: [ { connect: $starship} ]}){
                id
                starships {
                    name
                }
            }
        }`;

        request(url, mutation).then((data) => {
            let name = data.createHuman.starships[0].name;
            expect(name).to.be.eq("Millennium Falcon");
            done();
        }).catch(err => done(err));
    });

    it('export ID connect interface', (done) => {
        let mutation = `mutation($droid: ID!) {
            createDroid(data: { name: "R2-D2", appearsIn: [NEWHOPE, EMPIRE, JEDI] }){ id @export(as:"droid")}
            createHuman(data: { name: "Obi-Wan Kenobi", appearsIn: [NEWHOPE, EMPIRE, JEDI], friends: [ {connect: $droid} ]}){
                id
                friends {
                    name
                }
            }
        }`;

        request(url, mutation).then((data) => {
            let name = data.createHuman.friends[0].name;
            expect(name).to.be.eq("R2-D2");
            done();
        }).catch(err => done(err));
    });

    it('export ID connect union', (done) => {
        let mutation = `mutation($droid: ID!) {
            createDroid(data: { name: "R5-D4", appearsIn: [NEWHOPE] }){ id @export(as:"droid")}
            createReview(data: { episode: NEWHOPE, stars: 4, mentions: [ {connect: $droid} ]}){
                id
                mentions {
                    ...on Human { name }
                    ...on Droid { name }
                    ...on Starship { name } 
                }
            }
        }`;

        request(url, mutation).then((data) => {
            let name = data.createReview.mentions[0].name;
            expect(name).to.be.eq("R5-D4");
            done();
        }).catch(err => done(err));
    });

    it('export to create edge', (done) => {
        let mutation = `mutation($droid1: ID!, $droid2: ID!) {
            d1:createDroid(data: { name: "RA-7", appearsIn: [NEWHOPE] }){ id @export(as:"droid1") }
            d2:createDroid(data: { name: "GNK power droid", appearsIn: [NEWHOPE] }){ id @export(as:"droid2") }
            createFriendsEdgeFromDroid(data: { sourceID: $droid1, targetID: $droid2} ){
                id
                source { name }
                target { name }
            }
        }`;

        request(url, mutation).then((data) => {
            edgeId = data.createFriendsEdgeFromDroid.id;
            let d1 = data.createFriendsEdgeFromDroid.source.name;
            let d2 = data.createFriendsEdgeFromDroid.target.name;
            expect(d1).to.be.eq("RA-7")
            expect(d2).to.be.eq("GNK power droid");
            done();
        }).catch(err => done(err));
    });

    it('illegal export ID to connect', (done) => {
        let mutation = `mutation($starship: ID!) {
            createStarship(data: { name: "Millennium Falcon" }){ id @export(as:"starship")}
            createHuman(data: { name: "Han Solo", appearsIn: [NEWHOPE, EMPIRE, JEDI], friends: [ { connect: $starship} ]}){
                id
                friends {
                    name
                }
            }
        }`;

        request(url, mutation).then((data) => {
            done(new Error('Failed to detect illegal connect type'));
        }).catch(() => done());
    });

    it('export to update', (done) => {
        let mutation = `mutation($planet: String) {
            createHuman(data: {
                name: "John Doe",
                appearsIn: [],
                homePlanet: "Earth"
            }){
                homePlanet @export(as:"planet")
            }
            updateHuman(id: "${humanId}", data: {
                homePlanet: $planet
            }){
                name
                homePlanet
            }
        }`;

        request(url, mutation).then((data) => {
            let planet = data.updateHuman.homePlanet;
            expect(planet).to.be.eq("Earth");
            done();
        }).catch(err => done(err));
    });

    it('export to update edge', (done) => {
        let mutation = `mutation($x: String) {
            createHuman(data: { name: "Hello World!", appearsIn: [] }){ name @export(as:"x")}
            updateFriendsEdgeFromDroid(id: "${edgeId}", data: { description: $x }){
                id
                description
            }
        }`;

        request(url, mutation).then((data) => {
            let description = data.updateFriendsEdgeFromDroid.description;
            expect(description).to.be.eq("Hello World!");
            done();
        }).catch(err => done(err));
    });


    after((done) => {
        testServer.server.close(done);
    });
});
