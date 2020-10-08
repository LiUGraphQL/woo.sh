let driver;

module.exports = {
  get: function(options) {
    driver = options.driver;
    return resolvers;
  }
};

const resolvers = {
    Query: {
        person: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),


        listOfPersons: async (parent, args, context, info) =>
            await driver.getList(args, info),

        _ChildrenEdgeFromPerson: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),

    },

    Mutation: {
        createPerson: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('Person'), info),

        createChildrenEdgeFromPerson: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('Person'),
                'children',
                args.data.targetID,
                info.schema.getType('Person'),
                args.data.annotations,
                info),

        updatePerson: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('Person'),
                info),

    
        deletePerson: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('Person'), info),
    
        deleteChildrenEdgeFromPerson: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'ChildrenEdgeFromPerson',
                info.schema.getType('Person'),
                info),
    },

    Person: {
        id: (parent, args, context, info) => parent._id,
        children: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _childrenFromPerson: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingChildrenEdgesFromPerson: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingChildrenEdgeFromPerson: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },

    _ListOfPersons: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },

    _ChildrenEdgeFromPerson: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('Person'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('Person'), info.schema),
    },



}