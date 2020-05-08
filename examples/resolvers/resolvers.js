const tools = require('./arangodb-tools');

module.exports = {
  get: function() {
    return resolvers;
  }
};

const resolvers = {
    Query: {
        droid: async (parent, args, context, info) =>
            await tools.get(args.id, info.returnType, info.schema),
        human: async (parent, args, context, info) =>
            await tools.get(args.id, info.returnType, info.schema),
        planet: async (parent, args, context, info) =>
            await tools.get(args.id, info.returnType, info.schema),
        species: async (parent, args, context, info) =>
            await tools.get(args.id, info.returnType, info.schema),
        starship: async (parent, args, context, info) =>
            await tools.get(args.id, info.returnType, info.schema),

        listOfDroids: async (parent, args, context, info) =>
            await tools.getList(args, info),
        listOfHumans: async (parent, args, context, info) =>
            await tools.getList(args, info),
        listOfPlanets: async (parent, args, context, info) =>
            await tools.getList(args, info),
        listOfSpeciess: async (parent, args, context, info) =>
            await tools.getList(args, info),
        listOfStarships: async (parent, args, context, info) =>
            await tools.getList(args, info),

        listOfCharacters: async (parent, args, context, info) => await tools.getList(args, info),
    },

    Mutation: {
        createDroid: (parent, args, context, info) =>
            tools.create(true, context, args.data, info.schema.getType('Droid'), info),
        createHuman: (parent, args, context, info) =>
            tools.create(true, context, args.data, info.schema.getType('Human'), info),
        createPlanet: (parent, args, context, info) =>
            tools.create(true, context, args.data, info.schema.getType('Planet'), info),
        createSpecies: (parent, args, context, info) =>
            tools.create(true, context, args.data, info.schema.getType('Species'), info),
        createStarship: (parent, args, context, info) =>
            tools.create(true, context, args.data, info.schema.getType('Starship'), info),

        createFriendsEdgeFromDroid: async (parent, args, context, info) =>
            await tools.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Droid'),
                'friends',
                args.data.targetID,
                info.schema.getType('Character'),
                args.data.annotations,
                info),
        createFriendsEdgeFromHuman: async (parent, args, context, info) =>
            await tools.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Human'),
                'friends',
                args.data.targetID,
                info.schema.getType('Character'),
                args.data.annotations,
                info),
        createStarshipsEdgeFromHuman: async (parent, args, context, info) =>
            await tools.createEdge(
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
            await tools.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Species'),
                'origin',
                args.data.targetID,
                info.schema.getType('Planet'),
                args.data.annotations,
                info),

        updateDroid: async (parent, args, context, info) =>
            tools.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Droid'),
                info),
        updateHuman: async (parent, args, context, info) =>
            tools.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Human'),
                info),
        updatePlanet: async (parent, args, context, info) =>
            tools.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Planet'),
                info),
        updateSpecies: async (parent, args, context, info) =>
            tools.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Species'),
                info),
        updateStarship: async (parent, args, context, info) =>
            tools.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Starship'),
                info),
    },

    Droid: {
        id: (parent, args, context, info) => parent._id,
        friends: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
        _friendsFromDroid: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
        _friendsFromCharacter: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
        _friendsFromHuman: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
    },
    Human: {
        id: (parent, args, context, info) => parent._id,
        friends: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
        starships: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
        _friendsFromDroid: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
        _friendsFromCharacter: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
        _friendsFromHuman: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
    },
    Planet: {
        id: (parent, args, context, info) => parent._id,
        _homeWorldFromCharacter: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
        _originFromSpecies: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
    },
    Species: {
        id: (parent, args, context, info) => parent._id,
        origin: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
        _speciesFromCharacter: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
    },
    Starship: {
        id: (parent, args, context, info) => parent._id,
        _starshipsFromHuman: async (parent, args, context, info) =>
            await tools.getEdge(parent, args, info),
    },

    _ListOfDroids: {
        totalCount: async (parent, args, context, info) =>
            await tools.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await tools.isEndOfList(parent, args, info),
    },
    _ListOfHumans: {
        totalCount: async (parent, args, context, info) =>
            await tools.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await tools.isEndOfList(parent, args, info),
    },
    _ListOfPlanets: {
        totalCount: async (parent, args, context, info) =>
            await tools.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await tools.isEndOfList(parent, args, info),
    },
    _ListOfSpeciess: {
        totalCount: async (parent, args, context, info) =>
            await tools.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await tools.isEndOfList(parent, args, info),
    },
    _ListOfStarships: {
        totalCount: async (parent, args, context, info) =>
            await tools.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await tools.isEndOfList(parent, args, info),
    },

    _FriendsEdgeFromDroid: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await tools.get(parent._from, info.schema.getType('Droid'), info.schema),
        target: async (parent, args, context, info) =>
            await tools.get(parent._to, info.schema.getType('Character'), info.schema),
    },
    _FriendsEdgeFromHuman: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await tools.get(parent._from, info.schema.getType('Human'), info.schema),
        target: async (parent, args, context, info) =>
            await tools.get(parent._to, info.schema.getType('Character'), info.schema),
    },
    _StarshipsEdgeFromHuman: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await tools.get(parent._from, info.schema.getType('Human'), info.schema),
        target: async (parent, args, context, info) =>
            await tools.get(parent._to, info.schema.getType('Starship'), info.schema),
    },
    _OriginEdgeFromSpecies: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await tools.get(parent._from, info.schema.getType('Species'), info.schema),
        target: async (parent, args, context, info) =>
            await tools.get(parent._to, info.schema.getType('Planet'), info.schema),
    },

    Character: {
        __resolveType: (parent, args, context, info) =>
            parent._id.split('/')[0]
    },
}