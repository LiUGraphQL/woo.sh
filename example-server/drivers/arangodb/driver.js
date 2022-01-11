const graphql = require('graphql');
const arangojs = require("arangojs");
const aql = arangojs.aql;
const { makeExecutableSchema } = require('graphql-tools');
const { ApolloError, gql } = require('apollo-server');
const waitOn = require('wait-on');

let db;
let disableEdgeValidation;
let disableDirectivesChecking;

module.exports = {
    init: async function (args) {
        await init(args);
    },
    getConnection: () => db,
    get: function (id, returnType, schema) {
        return get(id, returnType, schema);
    },
    getByKey: function (key, info) {
        return getByKey(key, info);
    },
    create: function (isRoot, context, data, returnType, info) {
        return create(isRoot, context, data, returnType, info);
    },
    createEdge: function (isRoot, ctxt, source, sourceType, sourceField, target, targetType, annotations, info) {
        return createEdge(isRoot, ctxt, source, sourceType, sourceField, target, targetType, annotations, info);
    },
    update: function (isRoot, ctxt, id, data, returnType, info) {
        return update(isRoot, ctxt, id, data, returnType, info);
    },
    updateEdge: function (isRoot, ctxt, id, data, edgeName, inputToUpdateType, info) {
        return updateEdge(isRoot, ctxt, id, data, edgeName, inputToUpdateType, info);
    },
    deleteObject: function (isRoot, context, id, typeToDelete, info) {
        return deleteObject(isRoot, context, id, typeToDelete, info);
    },
    deleteEdge: function (isRoot, ctxt, id, edgeName, sourceType, info) {
        return deleteEdge(isRoot, ctxt, id, edgeName, sourceType, info);
    },
    getEdge: async function (parent, args, info) {
        return await getEdge(parent, args, info)
    },
    getEdgeEndpoint: async function (parent, args, info) {
        return await getEdgeEndpoint(parent, args, info)
    },
    getList: async function (args, info) {
        return await getList(args, info);
    },
    getTotalCount: async function (parent, args, info) {
        return await getTotalCount(parent, args, info);
    },
    isEndOfList: async function (parent, args, info) {
        return await isEndOfList(parent, args, info);
    },
    addPossibleTypes: function (query, schema, type_name) {
        return addPossibleTypes(query, schema, type_name);
    },
    getEdgeCollectionName: function (type, field) {
        return getEdgeCollectionName(type, field);
    }
};

async function init(args) {
    let typeDefs = gql`${args.baseSchema}`;
    let dbName = args.dbName || 'dev-db';
    let url = args.dbUrl || 'http://localhost:8529';
    let drop = args.drop || false;
    disableDirectivesChecking = args['disableDirectivesChecking'] || false;
    disableEdgeValidation = args['disableEdgeValidation'] || false;
    cachingEnabled = args['cache'] === false ? false : true;
    db = new arangojs.Database({ url });
    // authenticaton?
    if(args.username && args.password){
        db.useBasicAuth(args.username, args.password);
    }

    // wait for ArangoDB
    console.info(`Waiting for ArangoDB to become available at ${url}`);
    let urlGet = url.replace(/^http(s?)(.+$)/, 'http$1-get$2');
    const opts = {
        resources: [urlGet],
        delay: 1000, // initial delay in ms
        interval: 1000, // poll interval in ms
        followRedirect: true
    };
    await waitOn(opts);
    console.info(`ArangoDB is now available at ${url}`);

    // if drop is set
    let dblist = await db.listDatabases();
    if (drop && dblist.includes(dbName)) {
        await db.dropDatabase(dbName).then(
            () => console.info(`Database ${dbName} dropped.`),
            (err) => console.error(err)
        );
    }
    const schema = makeExecutableSchema({
        'typeDefs': typeDefs,
        'resolvers': {}
    });

    await createAndUseDatabase(db, dbName);
    await createTypeCollections(db, schema);
    await createEdgeCollections(db, schema);
}

/**
 * Create and activate a new database.
 *
 * @param db
 * @param dbName
 * @returns {Promise<void>}
 */
async function createAndUseDatabase(db, dbName) {
    await db.createDatabase(dbName).then(
        () => { console.info(`Database '${dbName}' created`); },
        err => { console.warn(`Database '${dbName}' not created:`, err.response.body['errorMessage']); }
    );
    db.useDatabase(dbName);
}

/**
 * Create type collections based on the given schema.
 *
 * @param db
 * @param schema
 * @returns {Promise<void>}
 */
async function createTypeCollections(db, schema) {
    const type_definitions = getTypeDefinitions(schema, kind = 'GraphQLObjectType');
    for (let collection_name in type_definitions) {
        if (collection_name.startsWith('_') || collection_name.includes('EdgeFrom')) {
            continue; // skip
        }
        let collection = await db.collection(collection_name);
        await collection.create().then(
            () => { console.info(`Collection '${collection_name}' created`) },
            err => {
                console.warn(`Collection '${collection_name}' not created:`, err.response.body['errorMessage']);
            }
        );
    }
}

/**
 * Create edge collections based on the given schema.
 *
 * @param db
 * @param schema
 * @returns {Promise<void>}
 */
async function createEdgeCollections(db, schema) {
    let collections = [];
    const type_definitions = getTypeDefinitions(schema, kind = 'GraphQLObjectType');
    for (let type_name in type_definitions) {
        if (type_name.startsWith('_') || type_name.includes('EdgeFrom')) {
            continue;
        }
        let type = type_definitions[type_name];
        let fields = {};

        // collections for type and interface fields
        fields = getObjectOrInterfaceFields(type);
        for (let field_name of fields) {
            if (field_name.startsWith('_')) {
                continue;
            }
            let collection_name = getEdgeCollectionName(type_name, field_name);
            collections.push(collection_name);
        }
    }

    // create collections
    for (let collection_name of collections) {
        let collection = await db.edgeCollection(collection_name);
        await collection.create().then(
            () => {
                console.info(`Edge collection '${collection_name}' created`);
            },
            err => {
                console.warn(`Edge collection '${collection_name}' not created:`, err.response.body['errorMessage']);
            }
        );
    }
}

/**
 * Return the key name corresponding to a given type.
 *
 * @param type
 * @returns {string}
 */
function getKeyName(type) {
    return `_KeyFor${type}`;
}

/**
 * Get the name of the edge collection corresponding to a given type and field.
 *
 * @param type
 * @param field
 * @returns {string}
 */
function getEdgeCollectionName(type, field) {
    let f = capitalizeFirstLetter(field);
    let t = capitalizeFirstLetter(type);
    return `${f}EdgeFrom${t}`;
}

/**
 * Convenience method for capitalizing the first letter of a string.
 *
 * @param string
 * @returns {string}
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Extract the type definition map from a given schema, optionally limiting the returned types to a given kind.
 *
 * @param schema
 * @param kind
 */
function getTypeDefinitions(schema, kind = null) {
    let types = {};
    for (let i in schema.getTypeMap()) {
        let type = schema.getTypeMap()[i];
        if (type.name == 'Query' || type.name == 'Mutation') {
            continue;
        }
        if (kind == null || type.constructor.name == kind) {
            types[type.name] = type;
        }
    }
    return types;
}

/**
 * Return an object containing only the document portion of this object. This includes fields for which the values are
 * scalars, enums, lists of scalars, and lists of enums.
 *
 * @param object
 * @param type
 * @returns {map}
 */
function getScalarsAndEnums(object, type) {
    let outputObject = {};
    // add formatted scalar/enum to outputObject
    for (let i in type.getFields()) {
        let field = type.getFields()[i];
        let fieldType = graphql.getNamedType(field.type);
        if (graphql.isEnumType(fieldType) || graphql.isScalarType(fieldType)) {
            if (object[field.name] !== undefined) {
                outputObject[field.name] = formatFixVariable(fieldType, object[field.name]);
            }
        }
    }
    return outputObject;
}

/**
 * Return an object containing only the edge portion of this object. This includes fields for which the values are
 * GraphQL types, GraphQL interfaces, lists of GraphQL types, lists of GraphQL interfaces, GraphQL unions and lists of GraphQL unions.
 * @param object
 */
function getTypesAndInterfaces(object, type) {
    let doc = {};
    for (let i in type.getFields()) {
        let field = type.getFields()[i];
        let t = graphql.getNamedType(field.type);
        if (graphql.isObjectType(t) || graphql.isInterfaceType(t) || graphql.isUnionType(t)) {
            if (object[field.name] !== undefined) {
                doc[field.name] = object[field.name];
            }
        }
    }
    return doc;
}

/**
 * Get the names of all object type fields.
 * @param type
 * @returns {Array}
 */
function getObjectOrInterfaceFields(type) {
    let keys = [];
    for (let i in type.getFields()) {
        let value = type.getFields()[i];
        let t = graphql.getNamedType(value.type);
        if (graphql.isObjectType(t) || graphql.isInterfaceType(t) || graphql.isUnionType(t)) {
            keys.push(value.name);
        }
    }
    return keys;
}

// ----------------------------------------------------------

/* Mutations */

/**
 * Create a new edge between a source and a target. Target and source are defined as either IDs or AQL variables and
 * are validated.
 *
 * @param isRoot
 * @param ctxt
 * @param varOrSourceID
 * @param sourceType
 * @param sourceField
 * @param varOrTargetID
 * @param targetType
 * @param annotations
 * @param info
 * @param resVar = null (optional)
 * @param validateSource = true (optional)
 * @param validateTarget = true (optional)
 * @returns {null|Promise<any>}
 */
function createEdge(isRoot, ctxt, varOrSourceID, sourceType, sourceField, varOrTargetID, targetType, annotations, info, resVar = null, validateSource = true, validateTarget = true) {
    // init transaction (if not already defined)
    initTransaction(ctxt);
    const collectionName = getEdgeCollectionName(sourceType.name, sourceField);
    const collectionVar = getCollectionVar(collectionName, ctxt, true);
    ctxt.trans.code.push(`\n\t/* createEdge ${collectionName} */`);

    // prepare annotations
    if (annotations === null  || annotations === undefined) annotations = {};
    // substitute fields defined by exported variables
    const substitutedFields = substituteExportedVariables(annotations, ctxt);

    // create a new variable if resVar was not defined by the calling function
    resVar = resVar !== null ? resVar : createVar(ctxt);

    // inject variable values
    varOrSourceID = getExportedValue(varOrSourceID, ctxt);
    varOrTargetID = getExportedValue(varOrTargetID, ctxt);

    // define source and target as AQL vars
    const sourceVar = isVar(varOrSourceID) ? varOrSourceID : addParameterVar(ctxt, createParamVar(ctxt), varOrSourceID);
    const targetVar = isVar(varOrTargetID) ? varOrTargetID : addParameterVar(ctxt, createParamVar(ctxt), varOrTargetID);

    // add reference to source and target ID fields if needed
    const source = sourceVar.indexOf('.') !== -1 ? asAQLVar(sourceVar) : asAQLVar(sourceVar + '._id');
    const target = targetVar.indexOf('.') !== -1 ? asAQLVar(targetVar) : asAQLVar(targetVar + '._id');

    // define doc
    const doc = annotations;
    doc['_creationDate'] = new Date().valueOf();
    doc['__typename'] = `_${collectionName}`;
    const docVar = addParameterVar(ctxt, createParamVar(ctxt), doc);

    // validate edge
    validateEdge(ctxt, source, sourceType, sourceField, target, targetType, info, validateSource, validateTarget);

    // insert edge
    ctxt.trans.code.push(`let ${resVar} = db._query(aql\`INSERT MERGE(${asAQLVar(docVar)}, ${stringifyImportedFields(substitutedFields)}, {'_from': ${source}, '_to': ${target} }) IN ${asAQLVar(collectionVar)} RETURN NEW\`).next();`);

    // add exported variables from selection fields for root only
    addExportedVariables(isRoot, resVar, info, ctxt);

    // directives handling
    addFinalDirectiveChecksForType(ctxt, sourceType, asAQLVar(sourceVar), info.schema);

    // return promises for roots and null for nested result
    return isRoot ? getResult(ctxt, info, resVar) : null;
}

/**
 * Create an object including any nested objects and edges.
 *
 * @param isRoot
 * @param ctxt
 * @param data
 * @param returnType
 * @param info
 * @param resVar
 * @returns {null|Promise<any>}
 */
function create(isRoot, ctxt, data, returnType, info, resVar = null) {
    // init transaction
    initTransaction(ctxt);
    ctxt.trans.code.push(`\n\t/* create ${returnType.name} */`);

    // substitute fields defined by exported variables
    const substitutedFields = substituteExportedVariables(data, ctxt);

    // get non-object fields, add creation date and add as parameter
    const doc = getScalarsAndEnums(data, returnType);
    doc['_creationDate'] = new Date().valueOf();
    doc['__typename'] = returnType.name;
    const docVar = addParameterVar(ctxt, createParamVar(ctxt), doc);

    // create a new resVar if not defined by the calling function, resVar is the source vertex for all edges
    resVar = resVar !== null ? resVar : createVar(ctxt);

    const collectionVar = getCollectionVar(returnType.name, ctxt, true);

    // insert document and merge with imported fields
    ctxt.trans.code.push(`let ${resVar} = db._query(aql\`INSERT MERGE(${asAQLVar(docVar)}, ${stringifyImportedFields(substitutedFields)}) IN ${asAQLVar(collectionVar)} RETURN NEW\`).next();`);

    // add edges (i.e., all object fields)
    const edgeFields = getTypesAndInterfaces(data, returnType);
    for (const fieldName in edgeFields) {
        const targetType = graphql.getNamedType(returnType.getFields()[fieldName].type);

        // add all values for edge
        const values = Array.isArray(edgeFields[fieldName]) ? edgeFields[fieldName] : [edgeFields[fieldName]];
        for (let value of values) {
            if (value['connect'] === null){
                ctxt.trans.code.push(`throw "Value to connect is not defined"`);
                continue;
            }

            if (value['connect']) {
                createEdge(false, ctxt, resVar, returnType, fieldName, value['connect'], targetType, value['annotations'], info, null, false, true);
            } else {
                // reference to target
                let targetVar = createVar(ctxt);
                if (graphql.isInterfaceType(targetType) || graphql.isUnionType(targetType)) {
                    let typeToCreate = null;
                    for (let possibleType of info.schema.getPossibleTypes(targetType)) {
                        let possibleField = `create${possibleType.name}`;
                        if (value[possibleField] && typeToCreate) {
                            throw new ApolloError(`Multiple create fields defined for ${returnType}.${fieldName}`);
                        }
                        if (value[possibleField]) {
                            typeToCreate = possibleType;
                            create(false, ctxt, value[possibleField], typeToCreate, info, targetVar);
                            createEdge(false, ctxt, resVar, returnType, fieldName, targetVar, typeToCreate, value['annotations'], info, null, false, false);
                        }
                    }
                } else {
                    create(false, ctxt, value['create'], targetType, info, targetVar);
                    createEdge(false, ctxt, resVar, returnType, fieldName, targetVar, targetType, value['annotations'], info, null, false, false);
                }
            }
        }
    }

    // add exported variables from selection fields for root only
    addExportedVariables(isRoot, resVar, info, ctxt);

    // validate key
    validateKey(ctxt, resVar, returnType, info);
    // add final directives check
    let resVarId = isVar(resVar) ? resVar : addParameterVar(ctxt, createParamVar(ctxt), {'_id': resVar});
    addFinalDirectiveChecksForType(ctxt, returnType, asAQLVar(resVarId), info.schema);
    // return promises for roots and null for nested result

    return isRoot ? getResult(ctxt, info, resVar) : null;
}


/**
 * Update an edge.
 *
 * @param isRoot
 * @param ctxt
 * @param id
 * @param data
 * @param edgeName
 * @param inputToUpdateType
 * @param info
 * @param resVar
 * @returns {null|Promise<any>}
 */
function updateEdge(isRoot, ctxt, id, data, edgeName, inputToUpdateType, info, resVar = null) {
    // init transaction (if not already defined)
    initTransaction(ctxt);

    // create a new variable if resVar was not defined by the calling function
    resVar = resVar !== null ? resVar : createVar(ctxt);
    const collectionVar = getCollectionVar(edgeName, ctxt, true);
    ctxt.trans.code.push(`\n\t/* update edge ${edgeName} */`);

    // substitute fields defined by exported variables
    const substitutedFields = substituteExportedVariables(data, ctxt);

    // define doc
    const doc = getScalarsAndEnums(data, info.schema.getType(inputToUpdateType));;
    doc['_lastUpdateDate'] = new Date().valueOf();
    const docVar = addParameterVar(ctxt, createParamVar(ctxt), doc);
    const idVar = addParameterVar(ctxt, createParamVar(ctxt), id);

    ctxt.trans.code.push(`let ${resVar} = db._query(aql\`UPDATE PARSE_IDENTIFIER(${asAQLVar(idVar)}).key WITH MERGE(${asAQLVar(docVar)}, ${stringifyImportedFields(substitutedFields)}) IN ${asAQLVar(collectionVar)} RETURN NEW\`).next();`);

    //directives handling is not needed for edge updates as they can not have directives as of current

    // return promises for roots and null for nested result
    return isRoot ? getResult(ctxt, info, resVar) : null;
}

/**
 * Stringify an imported fields object for use in an AQL query.
 *
 * @param importedFields
 * @returns {string}
 */
function stringifyImportedFields(importedFields){
    let s = '{';
    let first = true;
    for(let i in importedFields){
        if(!first) s += ',';
        s += `"${i}": ${asAQLVar(importedFields[i])}`;
        first = false;
    }
    s += '}';
    return s;
}

/**
 * Find exported fields and bind them to AQL variable names. Variable references in the info object are replaced with
 * the corresponding variable definitions. Only root fields can be exported by the ArangoDB driver at this time.
 *
 * @param resVar
 * @param info
 * @param ctxt
 */
function addExportedVariables(isRoot, resVar, info, ctxt){
    // check exports only for the root field
    if(!isRoot) return;
    // find all exported variables and the corresponding selection fields
    for(let fieldNode of info.fieldNodes){
        for(let selection of fieldNode.selectionSet.selections){
            exportSelection(isRoot, resVar, selection, info, ctxt);
        }
    }
}

/**
 * Add exported variables references.
 *
 * @param isRoot
 * @param resVar
 * @param selection
 * @param info
 * @param ctxt
 */
function exportSelection(isRoot, resVar, selection, info, ctxt){
    // skip inline fragments
    if(selection.kind === 'InlineFragment') return;

    // skip non-root level, cannot export these fields
    if(selection.selectionSet !== undefined) {
        for(let s of selection.selectionSet.selections){
            exportSelection(false, resVar, s, info, ctxt)
        }
    }
    // selected field to be exported
    let fieldName = selection.name.value;
    for(let directive of selection.directives){
        if(directive.name.value !== 'export') continue;
        let varName = directive.arguments[0].value.value;
        if(!isRoot){
            ctxt.trans.code.push(`throw "Cannot export non-root field for variable $${varName}";`);
        }
        for(let argument of directive.arguments) {
            // Variable values will be injected instead of variable references. If a value is added to
            // the set of variables references to the original value is lost. Therefore we need to keep the
            // variable name as part of the value.
            for(let v of info.operation.variableDefinitions){
                if(v.variable.name.value === varName){
                    info.variableValues[varName] = v;
                }
            }

            // rename id field
            if(fieldName === 'id') fieldName = '_id';
            ctxt.trans.exportedVariables[varName] = `${resVar}.${fieldName}`;
            ctxt.trans.code.push(`let ${varName} = ${resVar}.${fieldName};`);
        }
    }
}

/**
 * Takes an input object, removes all fields defined by exported variables, and returns an object containing only the
 * exported fields. Note that the values of this returned object represent variable references in AQL (i.e., they are
 * not query parameters and need special treatment).
 *
 * @param data
 * @param ctxt
 */
function substituteExportedVariables(data, ctxt){
    const substitutes = {};
    for(let entry of Object.entries(data)) {
        const fieldName = entry[0];
        const value = entry[1];
        // if value is an object it must be a variable
        if(typeof value === 'object' && value !== null){
            if(value.kind === 'VariableDefinition'){
                const varName = value.variable.name.value;
                if(ctxt.trans.exportedVariables[varName] === undefined){
                    ctxt.trans.code.push(`throw "Variable $${varName} has not been exported";`);
                } else {
                    // remove field from data object
                    delete data[fieldName];
                    substitutes[fieldName] = ctxt.trans.exportedVariables[varName];
                }
            }
        }
    }
    return substitutes;
}

/**
 * Return the exported variable value if a variable, otherwise returns value.
 *
 * @param value
 * @returns {*}
 */
function getExportedValue(value, ctxt){
    // if value is an object it must be a variable
    if(typeof value === 'object' && value !== null){
        if(value.kind === 'VariableDefinition'){
            return ctxt.trans.exportedVariables[value.variable.name.value];
        }
    }
    return value;
}

/**
 * Update an object including, and replace existing edges.
 *
 * @param isRoot
 * @param ctxt
 * @param id
 * @param data
 * @param returnType
 * @param info
 * @param resVar
 * @returns {null|Promise<any>}
 */
function update(isRoot, ctxt, varOrID, data, returnType, info, resVar = null) {
    // init transaction
    initTransaction(ctxt);
    ctxt.trans.code.push(`\n\t/* update ${returnType.name} */`);

    // inject variable value
    varOrID = getExportedValue(varOrID, ctxt);
    // define as AQL var
    const idVar = isVar(varOrID) ? varOrID : addParameterVar(ctxt, createParamVar(ctxt), varOrID);

    // substitute fields defined by exported variables
    const substitutedFields = substituteExportedVariables(data, ctxt);

    // get non-object fields, add creation date and add as parameter
    let doc = getScalarsAndEnums(data, returnType);
    doc['_lastUpdateDate'] = new Date().valueOf();
    doc['__typename'] = returnType.name;
    let docVar = addParameterVar(ctxt, createParamVar(ctxt), doc);

    // create a new resVar if not defined by the calling function, resVar is the source vertex for all edges
    resVar = resVar !== null ? resVar : createVar(ctxt);
    let collectionVar = getCollectionVar(returnType.name, ctxt, true);

    // update document
    ctxt.trans.code.push(`let ${resVar} = db._query(aql\`UPDATE PARSE_IDENTIFIER(${asAQLVar(idVar)}).key WITH  MERGE(${asAQLVar(docVar)}, ${stringifyImportedFields(substitutedFields)}) IN ${asAQLVar(collectionVar)} RETURN NEW\`).next();`);

    // update edges (i.e., all object fields)	
    // Object update will be deprecated as part of #67	
    let edgeFields = getTypesAndInterfaces(data, returnType);
    for (let fieldName in edgeFields) {
        let targetType = graphql.getNamedType(returnType.getFields()[fieldName].type);

        // remove old edges	
        let edgeCollectionName = getEdgeCollectionName(returnType.name, fieldName);
        let edgeCollectionVar = getCollectionVar(edgeCollectionName, ctxt, true);
        ctxt.trans.code.push(`\n\t/* drop edges from ${edgeCollectionName} */`);
        ctxt.trans.code.push(`db._query(aql\`FOR v IN ${asAQLVar(edgeCollectionVar)} FILTER(v._from == ${asAQLVar(idVar)}) REMOVE v IN ${asAQLVar(edgeCollectionVar)}\`);`);

        // add all values for edge	
        let values = Array.isArray(edgeFields[fieldName]) ? edgeFields[fieldName] : [edgeFields[fieldName]];
        for (let value of values) {
            if (value['connect'] === null){
                ctxt.trans.code.push(`throw "Value to connect is not defined"`);
                continue;
            }

            if (value['connect']) {
                createEdge(false, ctxt, resVar, returnType, fieldName, value['connect'], targetType, value['annotations'], info, null, false, true);
            } else {
                // reference to target	
                let targetVar = createVar(ctxt);
                if (graphql.isInterfaceType(targetType)) {
                    let typeToCreate = null;
                    for (let possibleType of info.schema.getPossibleTypes(targetType)) {
                        let possibleField = `create${possibleType.name}`;
                        if (value[possibleField] && typeToCreate) {
                            throw new ApolloError(`Multiple create fields defined for ${returnType}.${fieldName}`);
                        }
                        if (value[possibleField]) {
                            typeToCreate = possibleType;
                            create(false, ctxt, value[possibleField], typeToCreate, info, targetVar);
                            createEdge(false, ctxt, resVar, returnType, fieldName, targetVar, typeToCreate, value['annotations'], info, null, false, false);
                        }
                    }
                } else if (graphql.isUnionType(targetType)) {
                    throw new ApolloError(`Inline updates of fields of union type is not supported! (Occurred for ${returnType}.${fieldName})`);
                } else {
                    create(false, ctxt, value['create'], targetType, info, targetVar);
                    createEdge(false, ctxt, resVar, returnType, fieldName, targetVar, targetType, value['annotations'], info, null, false, false);
                }
            }
        }
    }

    // add exported variables from selection fields for root only
    addExportedVariables(isRoot, resVar, info, ctxt);

    // check key
    validateKey(ctxt, resVar, returnType, info);
    // directives handling
    let resVarId = isVar(resVar) ? resVar : addParameterVar(ctxt, createParamVar(ctxt), { '_id': resVar });
    addFinalDirectiveChecksForType(ctxt, returnType, asAQLVar(resVarId), info.schema);
    // return promises for roots and null for nested result
    return isRoot ? getResult(ctxt, info, resVar) : null;
}

/**
 * Delete an edge with the given id
 *
 * @param isRoot
 * @param ctxt
 * @param id
 * @param edgeName
 * @param sourceType
 * @param info
 * @param resVar
 * @returns {null|Promise<any>}
 */
function deleteEdge(isRoot, ctxt, id, edgeName, sourceType, info, resVar = null) {
    // init transaction
    initTransaction(ctxt);
    ctxt.trans.code.push(`\n\t/* delete edge ${edgeName} */`);
    let idVar = addParameterVar(ctxt, createParamVar(ctxt), id);

    // create a new resVar if not defined by the calling function, resVar is the source vertex for all edges
    resVar = resVar !== null ? resVar : createVar(ctxt);
    let collectionVar = getCollectionVar(edgeName, ctxt, true);

    // return null if the key does not exists in the collection (i.e., don't throw error)
    ctxt.trans.code.push(`let ${resVar} = db._query(aql\`REMOVE PARSE_IDENTIFIER(${asAQLVar(idVar)}).key IN ${asAQLVar(collectionVar)} OPTIONS { ignoreErrors: true } RETURN OLD\`).next();`);
    ctxt.trans.code.push(`if(${resVar}){`);

    // directives handling
    addFinalDirectiveChecksForType(ctxt, sourceType, aql`${asAQLVar(resVar)}._source`, info.schema);
    // return promises for roots and null for nested result
    ctxt.trans.code.push(`}`);
    return isRoot ? getResult(ctxt, info, resVar) : null;
}

/**
 * Delete an object with the given id.
 *
 * @param isRoot
 * @param ctxt
 * @param id
 * @param type
 * @param info
 * @param resVar
 * @returns { null | Promise<any>}
 */
function deleteObject(isRoot, ctxt, varOrID, typeToDelete, info, resVar = null) {
    // init transaction
    initTransaction(ctxt);
    ctxt.trans.code.push(`\n\t/* delete ${typeToDelete} */`);

    // inject variable value
    varOrID = getExportedValue(varOrID, ctxt);
    // define as AQL var
    const idVar = isVar(varOrID) ? varOrID : addParameterVar(ctxt, createParamVar(ctxt), varOrID);

    // create a new resVar if not defined by the calling function, resVar is the source vertex for all edges
    resVar = resVar !== null ? resVar : createVar(ctxt);
    let collectionVar = getCollectionVar(typeToDelete, ctxt, true);

    // delete document
    // return null if the key does not exists in the collection (i.e., don't throw error)
    ctxt.trans.code.push(`let ${resVar} = db._query(aql\`REMOVE PARSE_IDENTIFIER(${asAQLVar(idVar)}).key IN ${asAQLVar(collectionVar)} OPTIONS { ignoreErrors: true } RETURN OLD\`).next();`);
    ctxt.trans.code.push(`if(${resVar}){`);

    // delete every edge either targeting, or originating from id
    for (let i in typeToDelete.getFields()) {
        let field = typeToDelete.getFields()[i];
        let t = graphql.getNamedType(field.type);

        // deleted by default behavior, ignore
        if (field.name.startsWith('_incoming') || field.name.startsWith('_outgoing') || (field.name.startsWith('_') && graphql.isInterfaceType(t))) {
            continue;
        }

        // delete edges
        if (graphql.isObjectType(t)) {
            if (field.name[0] == '_') {
                // delete return edge
                let type_name = graphql.getNamedType(field.type).name
                let pattern_string = `^_(.+?)From${type_name}$`; // get the non-reversed edge name
                let re = new RegExp(pattern_string);
                let field_name = re.exec(field.name)[1];
                let collectionName = getEdgeCollectionName(type_name, field_name);
                let collectionVar = asAQLVar(getCollectionVar(collectionName, ctxt, true));
                ctxt.trans.code.push(`db._query(aql\`FOR x IN ${collectionVar} FILTER x._from == ${asAQLVar(resVar)}._id OR x._to == ${asAQLVar(resVar)}._id REMOVE x IN ${collectionVar}\`);`);
            } else {
                // delete normal edge
                let collectionName = getEdgeCollectionName(typeToDelete.name, field.name);
                let collectionVar = asAQLVar(getCollectionVar(collectionName, ctxt, true));
                ctxt.trans.code.push(`db._query(aql\`FOR x IN ${collectionVar} FILTER x._from == ${asAQLVar(resVar)}._id OR x._to == ${asAQLVar(resVar)}._id REMOVE x IN ${collectionVar}\`);`);
            }
        }
    }

    // directives handling
    addFinalDirectiveChecksForType(ctxt, typeToDelete, aql`${asAQLVar(resVar)}._id`, info.schema);

    // invalidate cache
    ctxt.trans.code.push(`
        // remove from cache
        cacheKey = ${idVar};
        delete cache[cacheKey];
    `);

    // return promises for roots and null for nested result
    ctxt.trans.code.push(`}`);

    return isRoot ? getResult(ctxt, info, resVar) : null;
}

/* Queries */

/**
 * Get type or interface by ID.
 * @param id
 * @param returnType
 * @param schema
 * @returns {Promise<*>}
 */
async function get(id, returnType, schema) {
    let type = returnType;
    let query = [aql`FOR i IN`];
    if (graphql.isInterfaceType(type) || graphql.isUnionType(type)) {
        let possible_types = schema.getPossibleTypes(type);
        if (possible_types.length > 1) {
            query.push(aql`UNION(`);
        }
        for (let i in possible_types) {
            if (i != 0) {
                query.push(aql`,`);
            }
            let typeName = possible_types[i].name;
            if (typeName.startsWith('_'))
                typeName = typeName.substr(1)
            let collection = db.collection(typeName);
            query.push(aql`(FOR x IN ${collection} FILTER(x._id == ${id}) RETURN x)`);
        }
        if (possible_types.length > 1) {
            query.push(aql`)`);
        }
    } else {
        let typeName = type.name;
        if (typeName.startsWith('_'))
            typeName = typeName.substr(1)
        let collection = db.collection(typeName);
        query.push(aql`${collection} FILTER(i._id == ${id})`);
    }

    query.push(aql` RETURN i`);
    try {
        let q = aql.join(query);
        console.debug(q);
        const cursor = await db.query(q);
        return await cursor.next();
    } catch (err) {
        console.error(err);
        throw new ApolloError(err);
    }
}

/**
 * Get the source/target of a given edge field connected to parent.
 *
 * @param parent
 * @param args
 * @param info
 * @returns {Promise<*>}
 */
async function getEdgeEndpoint(parent, args, info) {
    let parent_type = graphql.getNamedType(info.parentType);
    let return_type = graphql.getNamedType(info.returnType);

    let field_name = info.fieldName;
    if (info.fieldName.startsWith('_')) { // reverse edge
        let pattern_string = `^_(.+?)From${return_type.name}$`; // get the non-reversed edge name
        let re = new RegExp(pattern_string);
        field_name = re.exec(info.fieldName)[1];
    }

    // Create query
    let query = [aql`FOR x IN`];
    if (info.fieldName.startsWith('_')) {
        // If the type that is the origin of the edge is an interface, then we need to check all the edge collections
        // corresponding to its implementing types. Note: This is only necessary when traversing some edges that are
        // defined in in the API schema for interfaces. The parent type will never be an interface type at this stage.
        if (graphql.isInterfaceType(return_type)) {
            let possible_types = info.schema.getPossibleTypes(return_type);
            if (possible_types.length > 1) query.push(aql`UNION(`);
            for (let i in possible_types) {
                if (i != 0) query.push(aql`,`);
                let collection = db.collection(getEdgeCollectionName(possible_types[i].name, field_name));
                query.push(aql`(FOR i IN 1..1 INBOUND ${parent._id} ${collection} RETURN i)`);
            }
            if (possible_types.length > 1) query.push(aql`)`);

        } else {
            let collection = db.collection(getEdgeCollectionName(return_type.name, field_name));
            query.push(aql`1..1 INBOUND ${parent._id} ${collection}`);
        }
    } else {
        let collection = db.edgeCollection(getEdgeCollectionName(parent_type.name, field_name));
        query.push(aql`1..1 OUTBOUND ${parent._id} ${collection}`);
    }

    // add filters
    let query_filters = [];
    if (args.filter && !isEmptyObject(args.filter)) {
        let filters = getFilters(args.filter, return_type);
        for (let i in filters) {
            i == 0 ? query_filters.push(aql`FILTER`) : query_filters.push(aql`AND`);
            query_filters = query_filters.concat(filters[i]);
        }
    }
    query = query.concat(query_filters);
    query.push(aql`RETURN x`);

    const cursor = await db.query(aql.join(query));
    if (graphql.isListType(graphql.getNullableType(info.returnType))) {
        return await cursor.all();
    } else {
        return await cursor.next();
    }
}

/**
 * Get edges between a parent and target for a given field.
 *
 * @param parent
 * @param args
 * @param info
 * @returns {Promise<*>}
 */
async function getEdge(parent, args, info) {
    let return_type = graphql.getNamedType(info.returnType);

    // Create query
    let query = [];

    // Saddly can't be lazy and just use 'ANY' for the directioning, as loops of length 1 would then give us duplicated resaults
    let direction_string = aql`INBOUND`;
    if (info.fieldName.startsWith("_outgoing"))
        direction_string = aql`OUTBOUND`;

    // If the type that is the origin of the edge is an interface, then we need to check all the edge collections
    // corresponding to its implementing types. Note: This is only necessary when traversing some edges that are
    // defined in in the API schema for interfaces. The parent type will never be an interface type at this stage.
    if (graphql.isInterfaceType(return_type)) {
        query.push(aql`FOR e IN`)
        let possible_types = info.schema.getPossibleTypes(return_type);
        if (possible_types.length > 1) query.push(aql`UNION(`);
        for (let i in possible_types) {
            if (i != 0) query.push(aql`,`);
            let collection = db.collection(possible_types[i].name.substr(1));
            query.push(aql`(FOR v, inner_e IN 1..1 ${direction_string} ${parent._id} ${collection} RETURN inner_e)`);
        }
        if (possible_types.length > 1) query.push(aql`)`);

    } else {
        let collection = db.edgeCollection(return_type.name.substr(1));
        query.push(aql`FOR v, e IN 1..1 ${direction_string} ${parent._id} ${collection}`);
    }

    // add filters
    let query_filters = [];
    if (args.filter != undefined && !isEmptyObject(args.filter)) {
        let filters = getFilters(args.filter, return_type, 'e');
        for (let i in filters) {
            i == 0 ? query_filters.push(aql`FILTER`) : query_filters.push(aql`AND`);
            query_filters = query_filters.concat(filters[i]);
        }
    }

    query = query.concat(query_filters);
    query.push(aql`RETURN e`);

    const cursor = await db.query(aql.join(query));
    if (graphql.isListType(graphql.getNullableType(info.returnType))) {
        return await cursor.all();
    } else {
        return await cursor.next();
    }
}

/**
 * Get object by key.
 *
 * @param key
 * @param returnType
 * @returns {Promise<*>}
 */
async function getByKey(key, returnType) {
    let type = graphql.getNamedType(returnType);
    let collection = db.collection(type.name);
    let query = [aql`FOR x IN ${collection}`];

    // add key filters
    for (let fieldName in key) {
        let value = key[fieldName];
        query.push(aql`FILTER x.${fieldName} == ${value}`);
    }
    query.push(aql`RETURN x`);
    try {
        let q = aql.join(query);
        console.debug(q);
        const cursor = await db.query(q);
        return await cursor.next();
    } catch (err) {
        console.error(err);
        throw new ApolloError(err);
    }
}

/**
 * Get a list of object of a given type.
 *
 * @param args
 * @param info
 * @returns {Promise<{content: *, _filter: Array}>}
 */
async function getList(args, info) {
    let typeOrInterface = graphql.getNamedType(info.returnType.getFields()['content'].type);
    let first = args.first;
    let after = args.after;

    let query = [aql`FOR x IN FLATTEN( FOR i IN [`];
    if (graphql.isInterfaceType(typeOrInterface)) {
        for (let i in info.schema.getPossibleTypes(typeOrInterface)) {
            let possibleType = info.schema.getPossibleTypes(typeOrInterface)[i];
            i == 0 ? null : query.push(aql`,`);
            query.push(aql`${db.collection(possibleType.name)}`);
        }
    } else {
        query.push(aql`${db.collection(typeOrInterface.name)}`);
    }
    query.push(aql`] RETURN i )`);

    // add filters
    let queryFilters = [];
    if (args.filter && !isEmptyObject(args.filter)) {
        let filters = getFilters(args.filter, typeOrInterface);
        for (let i in filters) {
            i == 0 ? queryFilters.push(aql`FILTER`) : queryFilters.push(aql`AND`);
            queryFilters = queryFilters.concat(filters[i]);
        }
    }
    query = query.concat(queryFilters);
    query.push(aql`FILTER x._id > ${after} SORT x._id LIMIT ${first} RETURN x`);
    try {
        let q = aql.join(query);
        console.debug(q);
        const cursor = await db.query(q);
        let result = await cursor.all();
        let list = {
            '_filter': queryFilters, // needed to resolve fields 'isEndOfList' and 'totalCount'
            'content': result
        };
        return list;
    } catch (err) {
        console.error(err);
        throw new ApolloError(err);
    }
}


/**
 * Create a new info object based on a field name. Does not modify fragments, rootValue, operation, or variableValues
 * in the original info object.
 *
 * Comment: Building a new info object in this way would help clean up some of the driver code. It would also be
 * necessary in the current setup if we wish to be able to export variables from non-root fields. For now, this function
 * is kept here for future reference.
 *
 * @param fieldName
 * @param info
 * @returns info object
 */
function buildInfo(fieldName, info){
    let fieldNodes = [];
    for(const fieldNode of info.fieldNodes){
        for(const selection of fieldNode.selectionSet.selections){
            if(selection.name.value === fieldName){
                fieldNodes = selection.selectionSet ? selection.selectionSet.selections : [];
                break;
            }
        }
    }
    return {
        fieldName,
        returnType:  info.schema.getType(info.returnType).getFields()[fieldName].type,
        fieldNodes,
        parentType: info.returnType,
        path: {"key": fieldName, "prev": info.path},
        schema: info.schema,
        fragments: info.fragments,
        rootValue: info.rootValue,
        operation: info.operation,
        variableValues: info.variableValues
    };
}

/**
 * Add a new variable binding to the current transaction and return the corresponding parameter name.
 *
 * @param ctxt
 * @param parameterName
 * @param value
 * @returns
 */
function addParameterVar(ctxt, varName, value) {
    if (ctxt.trans.params[varName] !== undefined) {
        throw new ApolloError(`Parameter name '${varName}' has already been allocated`);
    }
    ctxt.trans.params[varName] = value;
    return `params.${varName}`;
}

/**
 * Returns true if a string represents a variable.
 *
 * @param varOrID
 * @returns {boolean}
 */
function isVar(varOrID) {
    return varOrID.startsWith('_');
}

/**
 * Get a variable referencing a collection in the current transaction. Set 'writeLock' to true to add a write lock
 * to the collection.
 *
 * @param collection
 * @param ctxt
 * @param writeLock
 * @returns {string} AQL variable name
 */
function getCollectionVar(collection, ctxt = null, writeLock = false) {
    if (writeLock) {
        if (ctxt === null) {
            throw new ApolloError(`Attempted to acquire lock on collection ${collection} but context is undefined`);
        }
        ctxt.trans.write.add(collection);
    }
    return `db.${collection}`;
}

/**
 * Return the result promise for the given field and execute the transaction if no more operations are pending.
 *
 * @param ctxt
 * @param info
 * @param resVar
 */
function getResult(ctxt, info, resVar) {
    ctxt.trans.code.push('\n\t/* bind result for mutation field */');
    ctxt.trans.code.push(`result['${info.path.key}'] = ${resVar};`);

    // remove field from pending response fields
    ctxt.responseFields.splice(ctxt.responseFields.indexOf(info.path.key), 1);

    // if no more response fields are pending execute transaction
    if (ctxt.responseFields.length === 0 && ctxt.trans.open) {
        executeTransaction(ctxt).then(
            () => console.debug('Transaction executed'),
            (err) => console.error(err)
        );
    }

    // return promises for roots and null for nested result
    return getResultPromise(ctxt, info.path.key);
}

/**
 * Return a result promise that waits for the ongoing transaction to complete.
 *
 * @param ctxt
 * @param key
 * @returns {Promise<any>}
 */
function getResultPromise(ctxt, key) {
    return new Promise(function (resolve, reject) {
        (function waitForResult() {
            if (ctxt.trans.error !== undefined) {
                reject(ctxt.trans.error);
                return null;
            }
            if (ctxt.trans.results !== undefined) {
                return resolve(ctxt.trans.results[key]);
            }
            setTimeout(waitForResult, 10);
        })();
    });
}

/**
 * Validate an edge. Throws an error if the target or source are not valid objects for the edge, or if the field
 * in question is a non-list field for which an edge has already been added.
 *
 * @param ctxt
 * @param varOrSourceID
 * @param sourceType
 * @param sourceField
 * @param varOrTargetID
 * @param targetType
 * @param info
 * @param validateSource = true (optional)
 * @param validateTarget = true (optional)
 */
function validateEdge(ctxt, source, sourceType, sourceField, target, targetType, info, validateSource = true, validateTarget = true) {
    if (disableEdgeValidation) {
        console.log('Edge validation disabled');
        return;
    }

    if (validateSource) {
        ctxt.trans.code.push('/* source exists? */');
        exists(ctxt, source, sourceType, info.schema);
    }
    if (validateTarget) {
        ctxt.trans.code.push('/* target exists? */');
        exists(ctxt, target, targetType, info.schema);
    }

    // if field is not list type, verify that it is not already populated
    let fieldType = info.schema.getType(sourceType).getFields()[sourceField].type;

    if (graphql.isNonNullType(fieldType)) fieldType = fieldType.ofType; // Strip non Null if non Null
    if (!graphql.isListType(fieldType)) {
        let edgeCollection = getEdgeCollectionName(sourceType.name, sourceField);
        let collectionVar = getCollectionVar(edgeCollection);
        let query = `if(db._query(aql\`FOR x IN 1..1 OUTBOUND ${source} ${asAQLVar(collectionVar)} RETURN x\`).next()) { throw \`Edge already exists for ${sourceField} from '${source}'\`}`;
        ctxt.trans.code.push(query);
    }
}

/**
 * Verifies the existence of some type, interface, or edge.
 *
 * @param ctxt
 * @param varOrID
 * @param typeOrInterface
 * @param schema
 */
function exists(ctxt, varOrID, typeOrInterface, schema) {
    let aqlCollectionVars = [];
    if (graphql.isInterfaceType(typeOrInterface) || graphql.isUnionType(typeOrInterface)) {
        for (let possibleType of Object.values(schema.getPossibleTypes(typeOrInterface))) {
            aqlCollectionVars.push(asAQLVar(getCollectionVar(possibleType.name)));
        }
    } else {
        aqlCollectionVars.push(asAQLVar(getCollectionVar(typeOrInterface.name)));
    }

    let queries = [];
    for(let collection of aqlCollectionVars){
        queries.push(`LENGTH(FOR d IN ${collection} FILTER d._id == ${varOrID} LIMIT 1 RETURN true) > 0`);
    }

    // check cache
    ctxt.trans.code.push(`cacheKey = ${varOrID.substring(2,varOrID.length-1)};
        cache[cacheKey] = cache[cacheKey] === undefined ? [] : cache[cacheKey];
        if(${cachingEnabled} && cache[cacheKey].includes('${typeOrInterface}')){
            // skip cached
        } else if(!db._query(aql\`RETURN ${queries.join(' || ')}\`).next()){
            throw \`Object '${varOrID}' does not exist as instance of ${typeOrInterface}\`;
        }
        cache[cacheKey] = '${typeOrInterface}';
    `);
}

/**
 * Wraps a variable reference in ${...} (required to resolve references correctly in the AQL transaction code).
 *
 * @param varName
 * @returns {string}
 */
function asAQLVar(varName) {
    return '${' + varName + '}';
}

/**
 * Define a new transaction for the current context (unless already defined).
 *
 * @param ctxt
 */
function initTransaction(ctxt) {
    if (ctxt.trans === undefined) {
        ctxt.trans = {
            write: new Set(),
            params: {},
            open: true,
            queue: {},
            code: [
                'const db = require("@arangodb").db;',
                'const {aql} = require("@arangodb");',
                'let result = Object.create(null);',
                'let cache = Object.create(null);',
                'let cacheKey = null;'
            ],
            finalConstraintChecks: [],
            exportedVariables: {}
        };
    }
}

/**
 * Execute the active transaction. Store the results in the context variable.
 *
 * @param ctxt
 * @returns {Promise<null>}
 */
async function executeTransaction(ctxt) {
    // verify that transaction is still open
    if (!ctxt.trans.open) {
        console.warn('Warning: Attempted to execute a closed transaction.');
        return null;
    }
    ctxt.trans.open = false;

    // add all finalConstraintChecks to code before executing
    for (const row of ctxt.trans.finalConstraintChecks) {
        ctxt.trans.code.push(row);
    }

    try {
        let action = `function(params){\n\t${ctxt.trans.code.join('\n\t')}\n\treturn result;\n}`;
        
        console.debug(action);
        console.debug(ctxt.trans.params);
        ctxt.trans.results = await db.transaction(
            { write: Array.from(ctxt.trans.write), read: [] },
            action,
            ctxt.trans.params);
    } catch (e) {
        ctxt.trans.error = new ApolloError(e.message);
    }
}

/**
 * Validate the key of a document based on its key constraints.
 *
 * @param ctxt
 * @param varOrDoc
 * @param type
 * @param schema
 */
function validateKey(ctxt, varOrDoc, type, info) {
    let docVar = isVar(varOrDoc) ? varOrDoc : addParameterVar(ctxt, createParamVar(ctxt), varOrDoc);
    let collectionVar = getCollectionVar(type.name);

    let keyType = info.schema['_typeMap'][getKeyName(type.name)];
    if (keyType) {
        ctxt.trans.code.push('/* check key constraint */');
        let check = `if(db._query(aql\`FOR doc IN ${asAQLVar(collectionVar)} `;
        // add filters for all key fields
        check += `FILTER doc._id != ${asAQLVar(docVar)}._id `;
        for (let field_name in keyType._fields) {
            check += `FILTER doc.${field_name} == ${asAQLVar(docVar)}.${field_name} `;
        }
        check += `return doc\`).next()) { throw \`Duplicate key for ${type}\`; }`;
        ctxt.trans.code.push(check);
    }
}


/**
 * Convenience method for converting a javascript array into an AQL array.
 *
 * @param array
 * @returns {GeneratedAqlQuery[]}
 */
function asAqlArray(array) {
    let q = [aql`[`];
    for (let i in array) {
        i == 0 ? null : q.push(aql`,`);
        q.push(aql`${array[i]}`);
    }
    q.push(aql`]`);
    return q;
}


/**
 * Convert input data to match the format used for storage in the database. The function currently used only for
 * custom scalars.
 *
 * @param type (of field)
 * @param value
 * @returns
 */
function formatFixVariable(type, value) {
    let formattedValue = value;
    // DateTime has to be handled separately
    if (type.name == 'DateTime') {
        // if array
        if (Array.isArray(value)) {
            formattedValue = []
            for (let date in Object.values(value)) {
                formattedValue.push(new Date(date).valueOf());
            }
        }
        else {
            formattedValue = new Date(value).valueOf();
        }
    }
    return formattedValue;
}

/**
 * A small wrapper used by getFilters to call formatFixVariable.
 * @param field
 * @param type_to_filter
 * @param value
 * @returns value (in database ready format)
 */
function formatFixVariableWrapper(field, type_to_filter, v) {
    // no need to even try when we have _id as field
    if (field == '_id')
        return v;

    let _type = graphql.getNamedType(type_to_filter.getFields()[field].type);

    return formatFixVariable(_type, v);
}

/**
 * Build a list of filters (possibly nested) and return this as an array of AQL statements. Assumes that the variable
 * being filtered on is x unless otherwise statet.
 *
 * @param filterArg
 * @param type_to_filter
 * @param alias (optional)
 * @returns {Array}
 */
function getFilters(filterArg, type_to_filter, alias = 'x') {
    let filters = [];
    for (let i in filterArg) {
        let filter = filterArg[i];

        // rewrite id field
        if (i == 'id') {
            i = '_id';
        }

        if (i == '_and') { // AND expression
            let filterArray = [aql`(`];
            for (let j in filter) {
                j == 0 ? null : filterArray.push(aql`AND`);
                for (let f of getFilters(filter[j], type_to_filter)) {
                    filterArray = filterArray.concat(f);
                }
            }
            filterArray.push(aql`)`);
            filters.push(filterArray);
        } else if (i == '_or') { // OR expression
            let filterArray = [aql`(`];
            for (let j in filter) {
                j == 0 ? null : filterArray.push(aql`OR`);
                for (let f of getFilters(filter[j], type_to_filter)) {
                    filterArray = filterArray.concat(f);
                }
            }
            filterArray.push(aql`)`);
            filters.push(filterArray);
        } else if (i == '_not') { // NOT expression
            let filterArray = [aql`NOT (`];
            for (let f of getFilters(filter, type_to_filter)) {
                filterArray = filterArray.concat(f);
            }
            filterArray.push(aql`)`);
            filters.push(filterArray);
        }

        // prepared AQL literal referencing the alias field
        const v = aql.literal(`${alias}.${i}`);

        if(filter._eq) {
            let preparedArg = formatFixVariableWrapper(i, type_to_filter, filter._eq);
            filters.push([aql`${v} == ${preparedArg}`]);
        }
        if(filter._neq != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._neq);
            filters.push([aql`${v} != ${preparedArgs}`]);
        }
        if(filter._gt != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._gt);
            filters.push([aql`${v} > ${preparedArgs}`]);
        }
        if(filter._egt != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._egt);
            filters.push([aql`${v} >= ${preparedArgs}`]);
        }
        if(filter._lt != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._lt);
            filters.push([aql`${v} < ${preparedArgs}`]);
        }
        if(filter._elt != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._elt);
            filters.push([aql`${v} <= ${preparedArgs}`]);
        }
        if(filter._in != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._in)
            let q = [aql`${v} IN `];
            q = q.concat(asAqlArray(preparedArgs));
            filters.push(q);
        }
        if(filter._nin != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._nin);
            let q = [aql`${v} NOT IN `];
            q = q.concat(asAqlArray(preparedArgs));
            filters.push(q);
        }
        if(filter._like != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._like);
            filters.push([aql`LIKE(${v}, ${preparedArgs}, false)`]);
        }
        if(filter._ilike != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._ilike);
            filters.push([aql`LIKE(${v}, ${preparedArgs}, true)`]);
        }
        if(filter._nlike != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._nlike);
            filters.push([aql`NOT LIKE(${v}, ${preparedArgs}, false)`]);
        }
        if(filter._nilike != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._nilike);
            filters.push([aql`NOT LIKE(${v}, ${preparedArgs}, true)`]);
        }
    }

    return filters;
}

/**
 * Return true if the list of results cover the end of the list.
 *
 * @param parent
 * @param ctxt
 * @param args
 * @param info
 * @returns {Promise<boolean>}
 */
async function isEndOfList(parent, args, info) {
    let type = graphql.getNamedType(info.parentType.getFields()['content'].type);
    let query = [aql`FOR x IN FLATTEN(FOR i IN [`];
    query.push(getPossibleTypes(type, info.schema));;
    query.push(aql`] RETURN i)`);

    // add filters
    query.push(...parent._filter);

    // get last ID in parent content
    if (parent.content.length != 0) {
        const last = parent.content[parent.content.length - 1];
        query.push(aql`FILTER(x._id > ${last._id})`);
    }

    query.push(aql`SORT x._id COLLECT WITH COUNT INTO length RETURN length`);
    try {
        console.debug(aql.join(query));
        const cursor = await db.query(aql.join(query));
        const result = await cursor.next();
        return result == 0;
    } catch (err) {
        console.error(err);
        throw new ApolloError(err);
    }
}

/**
 * Get the total number of items available for a given type or interface.
 *
 * @param parent
 * @param ctxt
 * @param args
 * @param info
 * @returns {Promise<*>}
 */
async function getTotalCount(parent, args, info) {
    let type = graphql.getNamedType(info.parentType.getFields()['content'].type);
    let query = [aql`FOR x IN FLATTEN(FOR i IN [`];
    query.push(getPossibleTypes(type, info.schema));
    query.push(aql`] RETURN i)`);

    // add filters
    query.push(...parent._filter);

    query.push(aql`COLLECT WITH COUNT INTO length RETURN length`);
    try {
        console.debug(aql.join(query));
        const cursor = await db.query(aql.join(query));
        return await cursor.next();
    } catch (err) {
        console.error(err);
        throw new ApolloError(err);
    }
}

/**
 * Return true if an object is empty.
 * @param object
 * @returns {boolean}
 */
function isEmptyObject(object) {
    for (let i in object) {
        return false;
    }
    return true;
}

/**
 * Create a new variable name to be used in a transaction. The variable is generated based on a counter bound to the
 * context object.
 *
 * @param ctxt
 * @returns {string}
 */
function createVar(ctxt) {
    ctxt.varCounter = ctxt.varCounter === undefined ? 0 : ctxt.varCounter + 1;
    return `_x${ctxt.varCounter}`;
}

/**
 * Create a new parameter variable name to be used in a transaction. The variable is generated based on a counter bound
 * to the context object.
 *
 * @param ctxt
 * @returns {string}
 */
function createParamVar(ctxt) {
    ctxt.paramVarCounter = ctxt.paramVarCounter === undefined ? 0 : ctxt.paramVarCounter + 1;
    return `_${ctxt.paramVarCounter}`;
}

/**
 * Return an AQL query fragment listing all possible collections for the given type.
 *
 * If context is not null, collections are explicitly bound to AQL variables.
 *
 * @param type
 * @param schema
 * @param conext = null (optional)
 */
function getPossibleTypes(type, schema, ctxt = null) {
    let collections = [];
    let types = graphql.isUnionType(type) || graphql.isInterfaceType(type) ? schema.getPossibleTypes(type): [type];

    for (let t of types) {
        if (ctxt !== null) {
            let collectionVar = asAQLVar(getCollectionVar(t.name, ctxt, true));
            collections.push(collectionVar);
        } else {
            let collection = db.collection(t.name)
            collections.push(aql`${collection}`);
        }
    }
    return aql.join(collections, ',');
}

/**
 * Add all possible collections for the given type to query
 * If context is not null, it is assumed it is for a mutation.
 * Else that it is for a query.
 * @param query (modifies)
 * @param schema
 * @param type
 * @param conext = null (optional)
 */
function addPossibleTypes(query, schema, type, ctxt = null) {
    if (graphql.isInterfaceType(type)) {
        let possible_types = schema.getPossibleTypes(type);
        for (let i in possible_types) {
            if (i != 0) query.push(`,`);
            if (ctxt !== null) {
                let collectionVar = asAQLVar(getCollectionVar(possible_types[i].name, ctxt, true));
                query.push(collectionVar);
            }
            else {
                let collection = db.collection(possible_types[i].name)
                query.push(aql`${collection}`);
            }
        }
    } else {
        if (ctxt !== null) {
            let collectionVar = asAQLVar(getCollectionVar(type.name, ctxt, true));
            query.push(collectionVar);
        }
        else {
            let collection = db.collection(type.name);
            query.push(aql`${collection}`);
        }
    }
}

/**
 * Add all possible edge-collections for the given type and field to query
 * @param query (modifies)
 * @param ctxt
 * @param schema
 * @param type_name
 * @param field_name
 */
function addPossibleEdgeTypes(query, ctxt, schema, type_name, field_name) {
    let type = schema._typeMap[type_name];
    if (graphql.isInterfaceType(type)) {
        let possible_types = schema.getPossibleTypes(type);
        for (let i in possible_types) {
            if (i != 0) query.push(`,`);
            let collectionName = getEdgeCollectionName(possible_types[i].name, field_name);
            let collectionVar = asAQLVar(getCollectionVar(collectionName, ctxt, true));
            query.push(collectionVar);
        }
    } else {
        let collectionName = getEdgeCollectionName(type.name, field_name);
        let collectionVar = asAQLVar(getCollectionVar(collectionName, ctxt, true));
        query.push(collectionVar);
    }
}

/**
 * Append finalConstraintChecks to ctxt for all directives of all fields in input type
 * @param ctxt (modifies)
 * @param type
 * @param resVar
 * @param schema
 * @param operation = null (optional)
 */
function addFinalDirectiveChecksForType(ctxt, type, id, schema) {
    if (disableDirectivesChecking) {
        console.debug('Directives checking disabled');
        return;
    }

    for (let f in type.getFields()) {
        let field = type.getFields()[f];
        for (let dir of field.astNode.directives) {
            if (dir.name.value == 'noloops') {
                let collectionName = getEdgeCollectionName(type.name, field.name);
                let collectionVar = asAQLVar(getCollectionVar(collectionName, ctxt, true));
                ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR v, e, p IN 1..1 OUTBOUND ${id} ${collectionVar} FILTER p.vertices[0]._id == v._id RETURN v\`).next()){`);
                ctxt.trans.finalConstraintChecks.push(`   throw "Field ${f} in ${type.name} is breaking a @noloops directive!";`);
                ctxt.trans.finalConstraintChecks.push(`}`);
            }
            else if (dir.name.value == 'distinct') {
                let collectionName = getEdgeCollectionName(type.name, field.name);
                let collectionVar = asAQLVar(getCollectionVar(collectionName, ctxt, true));
                ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR v, e IN 1..1 OUTBOUND ${id} ${collectionVar} FOR v2, e2 IN 1..1 OUTBOUND ${id} ${collectionVar} FILTER v._id == v2._id AND e._id != e2._id RETURN v\`).next()){`);
                ctxt.trans.finalConstraintChecks.push(`   throw "Field ${f} in ${type.name} is breaking a @distinct directive!";`);
                ctxt.trans.finalConstraintChecks.push(`}`);
            }
            else if (dir.name.value == 'uniqueForTarget') {
                // The direct variant of @uniqueForTarget
                // edge is named after current type etc.
                let collectionName = getEdgeCollectionName(type.name, field.name);
                let collectionVar = asAQLVar(getCollectionVar(collectionName, ctxt, true));
                ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR v, e IN 1..1 OUTBOUND ${id} ${collectionVar} FOR v2, e2 IN 1..1 INBOUND v._id ${collectionVar} FILTER e._id != e2._id RETURN v\`).next()){`);
                ctxt.trans.finalConstraintChecks.push(`   throw "Field ${f} in ${type.name} is breaking a @uniqueForTarget directive!";`);
                ctxt.trans.finalConstraintChecks.push(`}`);
            }
            else if (dir.name.value == '_uniqueForTarget_AccordingToInterface') {
                // The inherited/implemented variant of @uniqueForTarget
                // The target does not only require at most one edge of this type, but at most one of any type implementing the interface
                // Thankfully we got the name of the interface as a mandatory argument and can hence use this to get all types implementing it

                let interfaceName = dir.arguments[0].value.value; // If we add more arguments to the directive this will fail horrible.
                // But that should not happen (and it is quite easy to fix)

                ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR v, e IN 1..1 OUTBOUND ${id}`);
                addPossibleEdgeTypes(ctxt.trans.finalConstraintChecks, ctxt, schema, interfaceName, field.name);
                ctxt.trans.finalConstraintChecks.push(`FOR v2, e2 IN 1..1 INBOUND v._id`);
                addPossibleEdgeTypes(ctxt.trans.finalConstraintChecks, ctxt, schema, interfaceName, field.name);
                ctxt.trans.finalConstraintChecks.push(`FILTER e._id != e2._id RETURN v\`).next()){`);
                ctxt.trans.finalConstraintChecks.push(`   throw "Field ${f} in ${type.name} is breaking a @_uniqueForTarget_AccordingToInterface directive!";`);
                ctxt.trans.finalConstraintChecks.push(`}`);
            }
            else if (dir.name.value == 'requiredForTarget') {
                // The direct variant of @requiredForTarget
                // edge is named after current type etc.

                let collectionName = getEdgeCollectionName(type.name, field.name);
                let collectionVar = asAQLVar(getCollectionVar(collectionName, ctxt, true));

                // The target type might be an interface, giving us slightly more to keep track of
                // First, find the right collections to check
                ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR x IN FLATTEN(FOR i IN [`);
                addPossibleTypes(ctxt.trans.finalConstraintChecks, schema, graphql.getNamedType(field.type), ctxt);
                // Second, count all edges ending at objects in these collections
                ctxt.trans.finalConstraintChecks.push(`] RETURN i) LET endpoints = ( FOR v IN 1..1 INBOUND x ${collectionVar} RETURN v)`);
                // If the count returns 0, we have an object breaking the directive
                ctxt.trans.finalConstraintChecks.push(`FILTER LENGTH(endpoints) == 0 RETURN x\`).next()){`);
                ctxt.trans.finalConstraintChecks.push(`   throw "There are object(s) breaking the @requiredForTarget directive of Field ${f} in ${type.name}!";`);
                ctxt.trans.finalConstraintChecks.push(`}`);
            }
            else if (dir.name.value == '_requiredForTarget_AccordingToInterface') {
                // The inherited/implemented variant of @requiredForTarget
                // The target does not directly require an edge of this type, but at least one of any type implementing the interface
                // Thankfully we got the name of the interface as a mandatory argument and can hence use this to get all types implementing it

                let interfaceName = dir.arguments[0].value.value; // If we add more arguments to the directive this will fail horrible.
                // But that should not happen (and it is quite easy to fix)

                // The target type might be an interface, giving us slightly more to keep track of
                // First, find the right collections to check
                ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR x IN FLATTEN(FOR i IN [`);
                addPossibleTypes(ctxt.trans.finalConstraintChecks, schema, graphql.getNamedType(field.type), ctxt);
                // Second, count all edges ending at objects in these collections
                ctxt.trans.finalConstraintChecks.push(`] RETURN i) LET endpoints = ( FOR v IN 1..1 INBOUND x `);
                addPossibleEdgeTypes(ctxt.trans.finalConstraintChecks, ctxt, schema, interfaceName, field.name);
                ctxt.trans.finalConstraintChecks.push(` RETURN v)`);
                // If the count returns 0, we have an object breaking the directive
                ctxt.trans.finalConstraintChecks.push(`FILTER LENGTH(endpoints) == 0 RETURN x\`).next()){`);
                ctxt.trans.finalConstraintChecks.push(`   throw "There are object(s) breaking the inherited @_requiredForTarget_AccordingToInterface directive of Field ${f} in ${type.name}!";`);
                ctxt.trans.finalConstraintChecks.push(`}`);
            }
            else if (dir.name.value == 'required' && field.name[0] == '_') {
                // This is actually the reverse edge of a @requiredForTarget directive

                let type_name = graphql.getNamedType(field.type).name
                let pattern_string = `^_(.+?)From${type_name}$`; // get the non-reversed edge name
                let re = new RegExp(pattern_string);
                let field_name = re.exec(field.name)[1];

                // First make sure the documment actually still exists in the collection
                let collectionVar = asAQLVar(getCollectionVar(type.name, ctxt, true));
                ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR x IN ${collectionVar} FILTER x._id == ${id}._id RETURN x\`).next()){`);
                // If it does exists, make sure there is at least one edge to it
                ctxt.trans.finalConstraintChecks.push(`if(!db._query(aql\`FOR x IN 1..1 INBOUND ${id}`);
                addPossibleEdgeTypes(ctxt.trans.finalConstraintChecks, ctxt, schema, graphql.getNamedType(field.type), field_name);
                ctxt.trans.finalConstraintChecks.push(`RETURN x\`).next()){`);
                ctxt.trans.finalConstraintChecks.push(`throw "Field ${f} in ${type.name} is breaking a @requiredForTarget directive (in reverse)!";`);
                ctxt.trans.finalConstraintChecks.push(`}`);
                ctxt.trans.finalConstraintChecks.push(`}`);
            }
        }
    }
}
