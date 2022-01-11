let driver;

module.exports = {
  get: function(options) {
    driver = options.driver;
    return resolvers;
  }
};

const resolvers = {
    Query: {
        droid: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        human: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        planet: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        species: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        starship: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),

        humanByKey: async (parent, args, context, info) =>
            await driver.getByKey(args.key, info.returnType),
        planetByKey: async (parent, args, context, info) =>
            await driver.getByKey(args.key, info.returnType),

        listOfDroids: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfHumans: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfPlanets: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfSpeciess: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfStarships: async (parent, args, context, info) =>
            await driver.getList(args, info),

        _FriendsEdgeFromCharacter: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _FriendsEdgeFromDroid: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _FriendsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _HomeWorldEdgeFromCharacter: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _HomeWorldEdgeFromDroid: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _HomeWorldEdgeFromHuman: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _OriginEdgeFromSpecies: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _SpeciesEdgeFromCharacter: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _SpeciesEdgeFromDroid: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _SpeciesEdgeFromHuman: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _StarshipsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _StyleEdgeFromStarship: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),

        character: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),

        listOfCharacters: async (parent, args, context, info) =>
            await driver.getList(args, info),
    },

    Mutation: {
        createDroid: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('Droid'), info),
        createHuman: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('Human'), info),
        createPlanet: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('Planet'), info),
        createSpecies: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('Species'), info),
        createStarship: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('Starship'), info),

        createFriendsEdgeFromDroid: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Droid'),
                'friends',
                args.data.targetID,
                info.schema.getType('Character'),
                args.data.annotations,
                info),
        createHomeWorldEdgeFromDroid: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Droid'),
                'homeWorld',
                args.data.targetID,
                info.schema.getType('Planet'),
                args.data.annotations,
                info),
        createSpeciesEdgeFromDroid: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Droid'),
                'species',
                args.data.targetID,
                info.schema.getType('Species'),
                args.data.annotations,
                info),
        createFriendsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Human'),
                'friends',
                args.data.targetID,
                info.schema.getType('Character'),
                args.data.annotations,
                info),
        createHomeWorldEdgeFromHuman: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Human'),
                'homeWorld',
                args.data.targetID,
                info.schema.getType('Planet'),
                args.data.annotations,
                info),
        createSpeciesEdgeFromHuman: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Human'),
                'species',
                args.data.targetID,
                info.schema.getType('Species'),
                args.data.annotations,
                info),
        createStarshipsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Human'),
                'starships',
                args.data.targetID,
                info.schema.getType('Starship'),
                args.data.annotations,
                info),
        createOriginEdgeFromSpecies: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Species'),
                'origin',
                args.data.targetID,
                info.schema.getType('Planet'),
                args.data.annotations,
                info),
        createStyleEdgeFromStarship: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Starship'),
                'style',
                args.data.targetID,
                info.schema.getType('PlanetAndSpecies'),
                args.data.annotations,
                info),

        updateDroid: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Droid'),
                info),
        updateHuman: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Human'),
                info),
        updatePlanet: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Planet'),
                info),
        updateSpecies: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Species'),
                info),
        updateStarship: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Starship'),
                info),

    
        deleteDroid: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('Droid'), info),
        deleteHuman: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('Human'), info),
        deletePlanet: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('Planet'), info),
        deleteSpecies: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('Species'), info),
        deleteStarship: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('Starship'), info),
    
        deleteFriendsEdgeFromDroid: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'FriendsEdgeFromDroid',
                info.schema.getType('Droid'),
                info),
        deleteFriendsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'FriendsEdgeFromHuman',
                info.schema.getType('Human'),
                info),
        deleteHomeWorldEdgeFromDroid: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'HomeWorldEdgeFromDroid',
                info.schema.getType('Droid'),
                info),
        deleteHomeWorldEdgeFromHuman: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'HomeWorldEdgeFromHuman',
                info.schema.getType('Human'),
                info),
        deleteOriginEdgeFromSpecies: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'OriginEdgeFromSpecies',
                info.schema.getType('Species'),
                info),
        deleteSpeciesEdgeFromDroid: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'SpeciesEdgeFromDroid',
                info.schema.getType('Droid'),
                info),
        deleteSpeciesEdgeFromHuman: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'SpeciesEdgeFromHuman',
                info.schema.getType('Human'),
                info),
        deleteStarshipsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'StarshipsEdgeFromHuman',
                info.schema.getType('Human'),
                info),
        deleteStyleEdgeFromStarship: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'StyleEdgeFromStarship',
                info.schema.getType('Starship'),
                info),
    },

    Droid: {
        id: (parent, args, context, info) => parent._id,
        friends: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        homeWorld: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        species: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromCharacter: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromHuman: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromDroid: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingFriendsEdgesFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingHomeWorldEdgesFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingSpeciesEdgesFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingFriendsEdgesFromDroid: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromDroid: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingHomeWorldEdgesFromDroid: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingSpeciesEdgesFromDroid: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    Human: {
        id: (parent, args, context, info) => parent._id,
        friends: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        homeWorld: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        species: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        starships: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromCharacter: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromHuman: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromDroid: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingFriendsEdgesFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingHomeWorldEdgesFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingSpeciesEdgesFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingFriendsEdgesFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingHomeWorldEdgesFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingSpeciesEdgesFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingStarshipsEdgesFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromDroid: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    Planet: {
        id: (parent, args, context, info) => parent._id,
        _homeWorldFromCharacter: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _homeWorldFromHuman: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _homeWorldFromDroid: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _originFromSpecies: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _styleFromStarship: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _incomingHomeWorldEdgeFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingHomeWorldEdgeFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingHomeWorldEdgeFromDroid: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingOriginEdgeFromSpecies: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingStyleEdgeFromStarship: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    Species: {
        id: (parent, args, context, info) => parent._id,
        origin: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _speciesFromCharacter: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _speciesFromHuman: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _speciesFromDroid: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _styleFromStarship: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _incomingSpeciesEdgeFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingSpeciesEdgeFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingSpeciesEdgeFromDroid: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingOriginEdgesFromSpecies: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingStyleEdgeFromStarship: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    Starship: {
        id: (parent, args, context, info) => parent._id,
        style: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _starshipsFromHuman: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _incomingStarshipsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingStyleEdgesFromStarship: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },

    _ListOfDroids: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfHumans: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfPlanets: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfSpeciess: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfStarships: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },

    _ListOfCharacters: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },

    _FriendsEdgeFromDroid: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Droid'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Character'), info.schema),
    },
    _HomeWorldEdgeFromDroid: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Droid'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Planet'), info.schema),
    },
    _SpeciesEdgeFromDroid: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Droid'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Species'), info.schema),
    },
    _FriendsEdgeFromHuman: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Human'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Character'), info.schema),
    },
    _HomeWorldEdgeFromHuman: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Human'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Planet'), info.schema),
    },
    _SpeciesEdgeFromHuman: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Human'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Species'), info.schema),
    },
    _StarshipsEdgeFromHuman: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Human'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Starship'), info.schema),
    },
    _OriginEdgeFromSpecies: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Species'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Planet'), info.schema),
    },
    _StyleEdgeFromStarship: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Starship'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('PlanetAndSpecies'), info.schema),
    },

    _FriendsEdgeFromCharacter: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },
    _HomeWorldEdgeFromCharacter: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },
    _SpeciesEdgeFromCharacter: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },

    Character: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },
    _FriendsEdgeFromCharacter: {
        __resolveType: (parent, args, context, info) =>
            '_' + parent.__typename
    },
    _HomeWorldEdgeFromCharacter: {
        __resolveType: (parent, args, context, info) =>
            '_' + parent.__typename
    },
    _SpeciesEdgeFromCharacter: {
        __resolveType: (parent, args, context, info) =>
            '_' + parent.__typename
    },

    PlanetAndSpecies: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },

    PlanetAndSpecies: {
        __resolveType: (parent, args, context, info) =>
            parent._id.split('/')[0]
    },
}