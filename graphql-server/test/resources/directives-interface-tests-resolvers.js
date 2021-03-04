let driver;

module.exports = {
  get: function(options) {
    driver = options.driver;
    return resolvers;
  }
};

const resolvers = {
    Query: {
        distinctTest1: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        distinctTest2: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        noloopsTest1: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        noloopsTest2: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        requiredField1: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        requiredField2: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        requiredForTargetTarget: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        requiredForTargetTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        requiredForTargetsTarget: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        requiredForTargetsTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        requiredTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        uniqueForTargetTarget: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        uniqueForTargetTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),


        listOfDistinctTest1s: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfDistinctTest2s: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfNoloopsTest1s: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfNoloopsTest2s: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfRequiredField1s: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfRequiredField2s: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfRequiredForTargetTargets: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfRequiredForTargetTests: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfRequiredForTargetsTargets: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfRequiredForTargetsTests: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfRequiredTests: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfUniqueForTargetTargets: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfUniqueForTargetTests: async (parent, args, context, info) =>
            await driver.getList(args, info),

        _PossibleLoopEdgeFromNoloopsTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _PossibleLoopEdgeFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _PossibleLoopEdgeFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _PossibleLoopsEdgeFromNoloopsTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _PossibleLoopsEdgeFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _PossibleLoopsEdgeFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _RequiredEdgeFromRequiredTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _RequiredListEdgeFromRequiredTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _ShouldBeDistinctEdgeFromDistinctTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _ShouldBeDistinctEdgeFromDistinctTest1: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _ShouldBeDistinctEdgeFromDistinctTest2: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _TargetEdgeFromRequiredForTargetTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _TargetEdgeFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _TargetsEdgeFromRequiredForTargetsTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        _TargetsEdgeFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),

        distinctTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        noloopsTest: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),
        requiredField: async (parent, args, context, info) =>
            await driver.get(args.id, info.returnType, info.schema),

        listOfDistinctTests: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfNoloopsTests: async (parent, args, context, info) =>
            await driver.getList(args, info),
        listOfRequiredFields: async (parent, args, context, info) =>
            await driver.getList(args, info),
    },

    Mutation: {
        createDistinctTest1: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('DistinctTest1'), info),
        createDistinctTest2: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('DistinctTest2'), info),
        createNoloopsTest1: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('NoloopsTest1'), info),
        createNoloopsTest2: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('NoloopsTest2'), info),
        createRequiredField1: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('RequiredField1'), info),
        createRequiredField2: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('RequiredField2'), info),
        createRequiredForTargetTarget: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('RequiredForTargetTarget'), info),
        createRequiredForTargetTest: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('RequiredForTargetTest'), info),
        createRequiredForTargetsTarget: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('RequiredForTargetsTarget'), info),
        createRequiredForTargetsTest: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('RequiredForTargetsTest'), info),
        createRequiredTest: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('RequiredTest'), info),
        createUniqueForTargetTarget: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('UniqueForTargetTarget'), info),
        createUniqueForTargetTest: (parent, args, context, info) =>
            driver.create(true, context, args.data, info.schema.getType('UniqueForTargetTest'), info),

        createShouldBeDistinctEdgeFromDistinctTest1: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('DistinctTest1'),
                'shouldBeDistinct',
                args.data.targetID,
                info.schema.getType('DistinctTest'),
                args.data.annotations,
                info),
        createShouldBeDistinctEdgeFromDistinctTest2: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('DistinctTest2'),
                'shouldBeDistinct',
                args.data.targetID,
                info.schema.getType('DistinctTest'),
                args.data.annotations,
                info),
        createPossibleLoopEdgeFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('NoloopsTest1'),
                'possibleLoop',
                args.data.targetID,
                info.schema.getType('NoloopsTest'),
                args.data.annotations,
                info),
        createPossibleLoopsEdgeFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('NoloopsTest1'),
                'possibleLoops',
                args.data.targetID,
                info.schema.getType('NoloopsTest'),
                args.data.annotations,
                info),
        createPossibleLoopEdgeFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('NoloopsTest2'),
                'possibleLoop',
                args.data.targetID,
                info.schema.getType('NoloopsTest'),
                args.data.annotations,
                info),
        createPossibleLoopsEdgeFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('NoloopsTest2'),
                'possibleLoops',
                args.data.targetID,
                info.schema.getType('NoloopsTest'),
                args.data.annotations,
                info),
        createTargetEdgeFromRequiredForTargetTest: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('RequiredForTargetTest'),
                'target',
                args.data.targetID,
                info.schema.getType('RequiredForTargetTarget'),
                args.data.annotations,
                info),
        createTargetsEdgeFromRequiredForTargetsTest: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('RequiredForTargetsTest'),
                'targets',
                args.data.targetID,
                info.schema.getType('RequiredForTargetsTarget'),
                args.data.annotations,
                info),
        createRequiredEdgeFromRequiredTest: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('RequiredTest'),
                'required',
                args.data.targetID,
                info.schema.getType('RequiredField'),
                args.data.annotations,
                info),
        createRequiredListEdgeFromRequiredTest: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('RequiredTest'),
                'requiredList',
                args.data.targetID,
                info.schema.getType('RequiredField'),
                args.data.annotations,
                info),
        createTargetEdgeFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('UniqueForTargetTest'),
                'target',
                args.data.targetID,
                info.schema.getType('UniqueForTargetTarget'),
                args.data.annotations,
                info),
        createTargetsEdgeFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.createEdge(
                true,
                context,
                args.data.sourceID,
                info.schema.getType('UniqueForTargetTest'),
                'targets',
                args.data.targetID,
                info.schema.getType('UniqueForTargetTarget'),
                args.data.annotations,
                info),

        updateDistinctTest1: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('DistinctTest1'),
                info),
        updateDistinctTest2: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('DistinctTest2'),
                info),
        updateNoloopsTest1: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('NoloopsTest1'),
                info),
        updateNoloopsTest2: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('NoloopsTest2'),
                info),
        updateRequiredField1: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('RequiredField1'),
                info),
        updateRequiredField2: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('RequiredField2'),
                info),
        updateRequiredForTargetTarget: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('RequiredForTargetTarget'),
                info),
        updateRequiredForTargetTest: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('RequiredForTargetTest'),
                info),
        updateRequiredForTargetsTarget: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('RequiredForTargetsTarget'),
                info),
        updateRequiredForTargetsTest: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('RequiredForTargetsTest'),
                info),
        updateRequiredTest: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('RequiredTest'),
                info),
        updateUniqueForTargetTarget: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('UniqueForTargetTarget'),
                info),
        updateUniqueForTargetTest: async (parent, args, context, info) =>
            driver.update(
                true,
                context,
                args.id,
                args.data,
                info.schema.getType('UniqueForTargetTest'),
                info),

    
        deleteDistinctTest1: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('DistinctTest1'), info),
        deleteDistinctTest2: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('DistinctTest2'), info),
        deleteNoloopsTest1: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('NoloopsTest1'), info),
        deleteNoloopsTest2: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('NoloopsTest2'), info),
        deleteRequiredField1: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('RequiredField1'), info),
        deleteRequiredField2: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('RequiredField2'), info),
        deleteRequiredForTargetTarget: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('RequiredForTargetTarget'), info),
        deleteRequiredForTargetTest: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('RequiredForTargetTest'), info),
        deleteRequiredForTargetsTarget: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('RequiredForTargetsTarget'), info),
        deleteRequiredForTargetsTest: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('RequiredForTargetsTest'), info),
        deleteRequiredTest: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('RequiredTest'), info),
        deleteUniqueForTargetTarget: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('UniqueForTargetTarget'), info),
        deleteUniqueForTargetTest: (parent, args, context, info) =>
            driver.deleteObject(true, context, args.id, info.schema.getType('UniqueForTargetTest'), info),
    
        deletePossibleLoopEdgeFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'PossibleLoopEdgeFromNoloopsTest1',
                info.schema.getType('NoloopsTest1'),
                info),
        deletePossibleLoopEdgeFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'PossibleLoopEdgeFromNoloopsTest2',
                info.schema.getType('NoloopsTest2'),
                info),
        deletePossibleLoopsEdgeFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'PossibleLoopsEdgeFromNoloopsTest1',
                info.schema.getType('NoloopsTest1'),
                info),
        deletePossibleLoopsEdgeFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'PossibleLoopsEdgeFromNoloopsTest2',
                info.schema.getType('NoloopsTest2'),
                info),
        deleteRequiredEdgeFromRequiredTest: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'RequiredEdgeFromRequiredTest',
                info.schema.getType('RequiredTest'),
                info),
        deleteRequiredListEdgeFromRequiredTest: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'RequiredListEdgeFromRequiredTest',
                info.schema.getType('RequiredTest'),
                info),
        deleteShouldBeDistinctEdgeFromDistinctTest1: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'ShouldBeDistinctEdgeFromDistinctTest1',
                info.schema.getType('DistinctTest1'),
                info),
        deleteShouldBeDistinctEdgeFromDistinctTest2: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'ShouldBeDistinctEdgeFromDistinctTest2',
                info.schema.getType('DistinctTest2'),
                info),
        deleteTargetEdgeFromRequiredForTargetTest: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'TargetEdgeFromRequiredForTargetTest',
                info.schema.getType('RequiredForTargetTest'),
                info),
        deleteTargetEdgeFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'TargetEdgeFromUniqueForTargetTest',
                info.schema.getType('UniqueForTargetTest'),
                info),
        deleteTargetsEdgeFromRequiredForTargetsTest: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'TargetsEdgeFromRequiredForTargetsTest',
                info.schema.getType('RequiredForTargetsTest'),
                info),
        deleteTargetsEdgeFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.deleteEdge(
                true,
                context,
                args.id,
                'TargetsEdgeFromUniqueForTargetTest',
                info.schema.getType('UniqueForTargetTest'),
                info),
    },

    DistinctTest1: {
        id: (parent, args, context, info) => parent._id,
        shouldBeDistinct: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _shouldBeDistinctFromDistinctTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _shouldBeDistinctFromDistinctTest1: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _shouldBeDistinctFromDistinctTest2: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingShouldBeDistinctEdgesFromDistinctTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingShouldBeDistinctEdgeFromDistinctTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingShouldBeDistinctEdgesFromDistinctTest1: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingShouldBeDistinctEdgeFromDistinctTest1: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingShouldBeDistinctEdgeFromDistinctTest2: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    DistinctTest2: {
        id: (parent, args, context, info) => parent._id,
        shouldBeDistinct: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _shouldBeDistinctFromDistinctTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _shouldBeDistinctFromDistinctTest1: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _shouldBeDistinctFromDistinctTest2: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingShouldBeDistinctEdgesFromDistinctTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingShouldBeDistinctEdgeFromDistinctTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingShouldBeDistinctEdgeFromDistinctTest1: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingShouldBeDistinctEdgesFromDistinctTest2: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingShouldBeDistinctEdgeFromDistinctTest2: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    NoloopsTest1: {
        id: (parent, args, context, info) => parent._id,
        possibleLoop: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        possibleLoops: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopsFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopsFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopsFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingPossibleLoopEdgesFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopEdgeFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingPossibleLoopsEdgesFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopsEdgeFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingPossibleLoopEdgesFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopEdgeFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingPossibleLoopsEdgesFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopsEdgeFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopEdgeFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopsEdgeFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    NoloopsTest2: {
        id: (parent, args, context, info) => parent._id,
        possibleLoop: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        possibleLoops: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopsFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopsFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _possibleLoopsFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingPossibleLoopEdgesFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopEdgeFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingPossibleLoopsEdgesFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopsEdgeFromNoloopsTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopEdgeFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopsEdgeFromNoloopsTest1: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingPossibleLoopEdgesFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopEdgeFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingPossibleLoopsEdgesFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingPossibleLoopsEdgeFromNoloopsTest2: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    RequiredField1: {
        id: (parent, args, context, info) => parent._id,
        _requiredFromRequiredTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _requiredListFromRequiredTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _incomingRequiredEdgeFromRequiredTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingRequiredListEdgeFromRequiredTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    RequiredField2: {
        id: (parent, args, context, info) => parent._id,
        _requiredFromRequiredTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _requiredListFromRequiredTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _incomingRequiredEdgeFromRequiredTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingRequiredListEdgeFromRequiredTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    RequiredForTargetTarget: {
        id: (parent, args, context, info) => parent._id,
        _targetFromRequiredForTargetTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _incomingTargetEdgeFromRequiredForTargetTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    RequiredForTargetTest: {
        id: (parent, args, context, info) => parent._id,
        target: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingTargetEdgesFromRequiredForTargetTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    RequiredForTargetsTarget: {
        id: (parent, args, context, info) => parent._id,
        _targetsFromRequiredForTargetsTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _incomingTargetsEdgeFromRequiredForTargetsTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    RequiredForTargetsTest: {
        id: (parent, args, context, info) => parent._id,
        targets: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingTargetsEdgesFromRequiredForTargetsTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    RequiredTest: {
        id: (parent, args, context, info) => parent._id,
        required: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        requiredList: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingRequiredEdgesFromRequiredTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingRequiredListEdgesFromRequiredTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    UniqueForTargetTarget: {
        id: (parent, args, context, info) => parent._id,
        _targetFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _targetsFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _incomingTargetEdgeFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _incomingTargetsEdgeFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },
    UniqueForTargetTest: {
        id: (parent, args, context, info) => parent._id,
        target: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        targets: async (parent, args, context, info) =>
            await driver.getEdgeEndpoint(parent, args, info),
        _creationDate: async (parent, args, context, info) => new Date(parent._creationDate),
        _lastUpdateDate: async (parent, args, context, info) => new Date(parent._lastUpdateDate),
        _outgoingTargetEdgesFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
        _outgoingTargetsEdgesFromUniqueForTargetTest: async (parent, args, context, info) =>
            await driver.getEdge(parent, args, info),
    },

    _ListOfDistinctTest1s: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfDistinctTest2s: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfNoloopsTest1s: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfNoloopsTest2s: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfRequiredField1s: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfRequiredField2s: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfRequiredForTargetTargets: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfRequiredForTargetTests: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfRequiredForTargetsTargets: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfRequiredForTargetsTests: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfRequiredTests: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfUniqueForTargetTargets: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfUniqueForTargetTests: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },

    _ListOfDistinctTests: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfNoloopsTests: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },
    _ListOfRequiredFields: {
        totalCount: async (parent, args, context, info) =>
            await driver.getTotalCount(parent, args, info),
        isEndOfWholeList: async (parent, args, context, info) =>
            await driver.isEndOfList(parent, args, info),
    },

    _ShouldBeDistinctEdgeFromDistinctTest1: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('DistinctTest1'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('DistinctTest'), info.schema),
    },
    _ShouldBeDistinctEdgeFromDistinctTest2: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('DistinctTest2'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('DistinctTest'), info.schema),
    },
    _PossibleLoopEdgeFromNoloopsTest1: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('NoloopsTest1'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('NoloopsTest'), info.schema),
    },
    _PossibleLoopsEdgeFromNoloopsTest1: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('NoloopsTest1'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('NoloopsTest'), info.schema),
    },
    _PossibleLoopEdgeFromNoloopsTest2: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('NoloopsTest2'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('NoloopsTest'), info.schema),
    },
    _PossibleLoopsEdgeFromNoloopsTest2: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('NoloopsTest2'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('NoloopsTest'), info.schema),
    },
    _TargetEdgeFromRequiredForTargetTest: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('RequiredForTargetTest'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('RequiredForTargetTarget'), info.schema),
    },
    _TargetsEdgeFromRequiredForTargetsTest: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('RequiredForTargetsTest'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('RequiredForTargetsTarget'), info.schema),
    },
    _RequiredEdgeFromRequiredTest: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('RequiredTest'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('RequiredField'), info.schema),
    },
    _RequiredListEdgeFromRequiredTest: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('RequiredTest'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('RequiredField'), info.schema),
    },
    _TargetEdgeFromUniqueForTargetTest: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('UniqueForTargetTest'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('UniqueForTargetTarget'), info.schema),
    },
    _TargetsEdgeFromUniqueForTargetTest: {
        id: (parent, args, context, info) => parent._id,
        source: async (parent, args, context, info) =>
            await driver.get(parent._from, info.schema.getType('UniqueForTargetTest'), info.schema),
        target: async (parent, args, context, info) =>
            await driver.get(parent._to, info.schema.getType('UniqueForTargetTarget'), info.schema),
    },

    _PossibleLoopEdgeFromNoloopsTest: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },
    _PossibleLoopsEdgeFromNoloopsTest: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },
    _ShouldBeDistinctEdgeFromDistinctTest: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },

    DistinctTest: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },
    NoloopsTest: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },
    RequiredField: {
        __resolveType: (parent, args, context, info) =>
            parent.__typename
    },
    _PossibleLoopEdgeFromNoloopsTest: {
        __resolveType: (parent, args, context, info) =>
            '_' + parent.__typename
    },
    _PossibleLoopsEdgeFromNoloopsTest: {
        __resolveType: (parent, args, context, info) =>
            '_' + parent.__typename
    },
    _ShouldBeDistinctEdgeFromDistinctTest: {
        __resolveType: (parent, args, context, info) =>
            '_' + parent.__typename
    },


}