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
        review: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        starship: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),

        droidByKey: async (parent, args, context, info) =>
            await driver.getByKey(args.key, info.returnType),
        humanByKey: async (parent, args, context, info) =>
            await driver.getByKey(args.key, info.returnType),

        listOfDroids: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfHumans: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfReviews: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfStarships: async (parent, args, context, info) =>
            await driver.getList(args, info),

        _FriendsEdgeFromCharacter: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _FriendsEdgeFromDroid: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _FriendsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _MentionsEdgeFromReview: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _StarshipsEdgeFromHuman: async (parent, args, context, info) =>
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
        createReview: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('Review'), info),
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
        createMentionsEdgeFromReview: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Review'),
                'mentions',
                args.data.targetID,
                info.schema.getType('Entity'),
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
        updateReview: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Review'),
                info),
        updateStarship: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Starship'),
                info),

        updateStarshipsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.updateEdge(
                true,
                context,
                args.id,
                args.data,
                'StarshipsEdgeFromHuman',
                info.schema.getType('_InputToUpdateStarshipsEdgeFromHuman'),
                info),
    
        deleteDroid: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('Droid'), info),
        deleteHuman: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('Human'), info),
        deleteReview: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('Review'), info),
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
        deleteMentionsEdgeFromReview: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'MentionsEdgeFromReview',
                info.schema.getType('Review'),
                info),
        deleteStarshipsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'StarshipsEdgeFromHuman',
                info.schema.getType('Human'),
                info),
    },

    Droid: {
        id: (parent, args, context, info) => parent._id,
        friends: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromCharacter: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromHuman: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromDroid: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _mentionsFromReview: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingFriendsEdgesFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingFriendsEdgesFromDroid: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromDroid: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingMentionsEdgeFromReview: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    Human: {
        id: (parent, args, context, info) => parent._id,
        friends: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        starships: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromCharacter: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromHuman: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _friendsFromDroid: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _mentionsFromReview: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingFriendsEdgesFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromCharacter: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingFriendsEdgesFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingStarshipsEdgesFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingFriendsEdgeFromDroid: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingMentionsEdgeFromReview: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    Review: {
        id: (parent, args, context, info) => parent._id,
        mentions: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingMentionsEdgesFromReview: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    Starship: {
        id: (parent, args, context, info) => parent._id,
        _starshipsFromHuman: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _mentionsFromReview: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _incomingStarshipsEdgeFromHuman: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingMentionsEdgeFromReview: async (parent, args, context, info) =>
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
    _ListOfReviews: {
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
    _FriendsEdgeFromHuman: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Human'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Character'), info.schema),
    },
    _StarshipsEdgeFromHuman: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Human'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Starship'), info.schema),
    },
    _MentionsEdgeFromReview: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Review'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Entity'), info.schema),
    },

    _FriendsEdgeFromCharacter: {
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

    Entity: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },

    Entity: {
        __resolveType: (parent, args, context, info) =>
            parent._id.split('/')[0]
    },
}