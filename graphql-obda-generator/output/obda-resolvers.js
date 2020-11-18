let driver;

module.exports = {
  get: function(options) {
    driver = options.driver;
    return resolvers;
  }
};

const resolvers = {
    Query: {
        listOfMids: async (parent, args, context, info) => await getList(args, info, {'mappings': [{'type': 'Speaker', 'mapping': [{'type': 'Speaker'}]}], 'types': ['Speaker']}),
        listOfSpeakers: async (parent, args, context, info) => await getList(args, info, {'mappings': [{'type': 'Speaker', 'mapping': [{'type': 'Speaker'}]}], 'types': ['Speaker']}),
        listOfActors: async (parent, args, context, info) => await getList(args, info, {'mappings': [{'type': 'Person', 'mapping': [{'type': 'NamedEntity', 'filter': [{'field': 'type', 'type': 'enum', 'value': 'PERSON'}]}]}, {'type': 'Speaker', 'mapping': [{'type': 'Speaker'}]}], 'types': ['NamedEntity', 'Speaker']}),
        listOfPersons: async (parent, args, context, info) => await getList(args, info, {'mappings': [{'type': 'Person', 'mapping': [{'type': 'NamedEntity', 'filter': [{'field': 'type', 'type': 'enum', 'value': 'PERSON'}]}]}, {'type': 'Speaker', 'mapping': [{'type': 'Speaker'}]}], 'types': ['NamedEntity', 'Speaker']}),
    },
    Mid: {
        __resolveType: (parent) => parent.__typename
    },
    Actor: {
        __resolveType: (parent) => parent.__typename
    },
    Person: {
        __resolveType: (parent) => parent.__typename
    },
}

async function getList(args, info, definition){
    let results = {
        totalCount: -1,
        isEndOfWholeList: true,
        content: []
    };
    for(let d of definition["mappings"]){
        for(let mapping of d["mapping"]){
            console.log("Mapping:", mapping)
            let listType = info.schema['_typeMap'][`_ListOf${mapping["type"]}s`];
            let filter = getFilter(mapping["filter"]);

            // execute query
            info.returnType = info.schema['_typeMap'][`_ListOf${mapping["type"]}s`];
            
            
            let listOf = await driver.getList(args, info);
            results["content"] = [
                ...results["content"],
                ...listOf["content"]
            ]; 
        }
    }
    return results;
}