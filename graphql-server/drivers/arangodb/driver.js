const graphql = require('graphql');
const arangojs = require("arangojs");
const aql = arangojs.aql;
const { makeExecutableSchema } = require('graphql-tools');
const { ApolloError } = require('apollo-server');
const waitOn = require('wait-on');

let db;
let disableEdgeValidation;
let disableDirectivesChecking;

module.exports = {
    init: async function(args){
        let typeDefs = args.typeDefs;
        let db_name = args.db_name || 'dev-db';
        let url = args.url || 'http://localhost:8529';
        let drop = args.drop || false;
        disableDirectivesChecking = args.disableDirectivesChecking || true;
        disableEdgeValidation = args.disableEdgeValidation || false;
        db = new arangojs.Database({ url: url });

        // wait for ArangoDB
        console.log(`Waiting for ArangoDB to become available at ${url}`);
        let urlGet = url.replace(/^http(s?)(.+$)/,'http$1-get$2');
        const opts = {
            resources:[urlGet],
            delay: 1000, // initial delay in ms
            interval: 1000, // poll interval in ms
            followRedirect: true
        };
        await waitOn(opts);
        console.log(`ArangoDB is now available at ${url}`);

        // if drop is set
        if(drop) {
            await db.dropDatabase(db_name).then(
                () => console.log()
            );
        }
        const schema = makeExecutableSchema({
            'typeDefs': typeDefs,
            'resolvers': {}
        });

        await createAndUseDatabase(db, db_name);
        await createTypeCollections(db, schema);
        await createEdgeCollections(db, schema);
    },
    getConnection: () => db,
    get: function(id, returnType, schema){
        return get(id, returnType, schema);
    },
    getByKey: function(key, info){
        return getByKey(key, info);
    },
    create: function(isRoot, context, data, returnType, info) {
        return create(isRoot, context, data, returnType, info);
    },
    createEdge: async function(isRoot, ctxt, source, sourceType, sourceField, target, targetType, annotations, info) {
        return await createEdge(isRoot, ctxt, source, sourceType, sourceField, target, targetType, annotations, info);
    },
    update: async function(isRoot, ctxt, id, data, returnType, info){
        return await update(isRoot, ctxt, id, data, returnType, info);
    },
    getEdge: async function(parent, args, info){
        return await getEdge(parent, args, info)
    },
    getList: async function(args, info){
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
    addPossibleEdgeTypes: function (query, schema, type_name, field_name) {
        return addPossibleEdgeTypes(query, schema, type_name, field_name);
    },
    getEdgeCollectionName: function (type, field) {
        return getEdgeCollectionName(type, field);
    }
};

async function createAndUseDatabase(db, db_name){
    await db.createDatabase(db_name).then(
        () => { console.info(`Database '${db_name}' created`); },
        err => { console.warn(`Database '${db_name}' not created:`, err.response.body.errorMessage); }
    );
    db.useDatabase(db_name);
}

async function createTypeCollections(db, schema) {
    const type_definitions = getTypeDefinitions(schema, kind='GraphQLObjectType');
    for (let collection_name in type_definitions) {
        if(collection_name.startsWith('_') || collection_name.includes('EdgeFrom')){
            continue; // skip
        }
        let collection = await db.collection(collection_name);
        await collection.create().then(
            () => { console.info(`Collection '${collection_name}' created`) },
            err => {
                console.warn(`Collection '${collection_name}' not created:` , err.response.body.errorMessage);
            }
        );
    }
}

async function createEdgeCollections(db, schema){
    let collections = [];
    const type_definitions = getTypeDefinitions(schema, kind='GraphQLObjectType');
    for (let type_name in type_definitions) {
        if(type_name.startsWith('_') || type_name.includes('EdgeFrom')){
            continue;
        }
        let type = type_definitions[type_name];
        let fields = {};

        // collections for type and interface fields
        fields = getObjectOrInterfaceFields(type);
        for(let i in fields){
            let field_name = fields[i];
            if(field_name.startsWith('_')) {
                continue;
            }
            let collection_name = getEdgeCollectionName(type_name, field_name);
            collections.push(collection_name);
        }
    }

    // create collections
    for(let i in collections) {
        let collection_name = collections[i];
        let collection = await db.edgeCollection(collection_name);
        await collection.create().then(
            () => {
                console.info(`Edge collection '${collection_name}' created`);
            },
            err => {
                //console.warn(`Edge collection '${collection_name}' not created:`, err.response.body.errorMessage);
            }
        );
    }
}

function getKeyName(type){
    return `_KeyFor${type}`;
}

function getEdgeCollectionName(type, field){
    let f = capitalizeFirstLetter(field);
    let t = capitalizeFirstLetter(type);
    // return `EdgeToConnect${f}Of${t}`;
    return `${f}EdgeFrom${t}`;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getTypeDefinitions(schema, kind=null) {
    let types = {};
    for(let i in schema.getTypeMap()){
        let type = schema.getType(i);
        let name = type.name;
        if(name == 'Query' || name == 'Mutation'){
            continue;
        }
        if (kind == null || type.constructor.name == kind) {
            types[name] = type;
        }
    }
    return types;
}

/**
 * Get the names of all scalar and enum type fields.
 * @param type
 * @returns {Array}
 */
function getScalarOrEnumFields(type) {
    let keys = [];
    for (let i in type.getFields()) {
        let value = type.getFields()[i];
        let t = graphql.getNamedType(value.type);
        if(graphql.isEnumType(t) || graphql.isScalarType(t)){
            keys.push(value.name);
        }
    }
    return keys;
}

/**
 * Return an object containing only the document portion of this object. This includes fields for which the values are
 * scalars, enums, lists of scalars, and lists of enums.
 * @param object
 */
function getScalarsAndEnums(object, type){
    let doc = {};
    return formatFixInput(doc, object, type);
}

/**
 * Return an object containing only the edge portion of this object. This includes fields for which the values are
 * GraphQL types, GraphQL interfaces, lists of GraphQL types, and lists of GraphQL interfaces.
 * @param object
 */
function getTypesAndInterfaces(object, type){
    let doc = {};
    for (let i in type.getFields()) {
        let field = type.getFields()[i];
        let t = graphql.getNamedType(field.type);
        if(graphql.isObjectType(t) || graphql.isInterfaceType(t)){
            if(object[field.name] !== undefined) {
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
        if(graphql.isObjectType(t) || graphql.isInterfaceType(t)){
            keys.push(value.name);
        }
    }
    return keys;
}

/**
 * Transforms the doc (field_name, field_value) collection to JSON stringify, strip leading and ending '{' and '}' and insert leading ', '
 * This allows docs to be appanded to already existing input parameters.
 * @param doc (should already have passed through getScalarsAndEnums)
 * @returns String
 */
function convertToInputAppendString(doc) {
    ret = ''
    if (doc != null && doc.size > 0) {
        ret = JSON.stringify(doc);
        ret[0] = ',';
        ret = ret - slice(0, -1);
    }
    return ret;
}

// ----------------------------------------------------------

async function getEdge(parent, args, info){
    let parent_type = graphql.getNamedType(info.parentType);
    let return_type = graphql.getNamedType(info.returnType);

    let field_name = info.fieldName;
    if(info.fieldName.startsWith('_')){ // reverse edge
        let pattern_string = `^_(.+?)From${return_type.name}$`; // get the non-reversed edge name
        let re = new RegExp(pattern_string);
        field_name = re.exec(info.fieldName)[1];
    }

    // Create query
    let query = [aql`FOR x IN`];
    if(info.fieldName.startsWith('_')) {
        // If the type that is the origin of the edge is an interface, then we need to check all the edge collections
        // corresponding to its implementing types. Note: This is only necessary when traversing some edges that are
        // defined in in the API schema for interfaces. The parent type will never be an interface type at this stage.
        if(graphql.isInterfaceType(return_type)){
            let possible_types = info.schema.getPossibleTypes(return_type);
            if(possible_types.length > 1) query.push(aql`UNION(`);
            for(let i in possible_types) {
                if(i != 0) query.push(aql`,`);
                let collection = db.collection(getEdgeCollectionName(possible_types[i].name, field_name));
                query.push(aql`(FOR i IN 1..1 INBOUND ${parent._id} ${collection} RETURN i)`);
            }
            if(possible_types.length > 1) query.push(aql`)`);

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
    if(args.filter != undefined && !isEmptyObject(args.filter)){
        let filters = getFilters(args.filter, return_type);
        for(let i in filters){
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


function create(isRoot, ctxt, data, returnType, info) {
    // define transaction object
    if (ctxt.trans === undefined) ctxt.trans = initTransaction();

    // check key
    validateKey(ctxt, data, returnType, info.schema);

    // Do not increment the var counter
    let resVar = getVar(ctxt, false);
    let from = asAQLVar(resVar);

    // add doc
    let doc = getScalarsAndEnums(data, returnType);
    //Set creationDate
    let date = new Date();
    doc['_creationDate'] = date.valueOf();
    let docVar = getParamVar(ctxt);
    let aqlDocVar = asAQLVar(`params.${docVar}`);
    let collection = asAQLVar(`db.${returnType.name}`);
    ctxt.trans.write.add(returnType.name);
    ctxt.trans.params[docVar] = doc;
    ctxt.trans.code.push(`let ${resVar} = db._query(aql\`INSERT ${aqlDocVar} IN ${collection} RETURN NEW\`).next();`);

    // for edges
    let ob = getTypesAndInterfaces(data, returnType);
    for (let fieldName in ob) {
        let innerFieldType = graphql.getNamedType(returnType.getFields()[fieldName].type);
        let edge = getEdgeCollectionName(returnType.name, fieldName);
        ctxt.trans.write.add(edge);
        let edgeCollection = asAQLVar(`db.${edge}`);
        let values = Array.isArray(ob[fieldName]) ? ob[fieldName] : [ob[fieldName]]; // treat as list even if only one value is present

        for (let i in values) {
            let value = values[i];

            // Prepare annotations
            let annotations = null;
            if (value['annotations']) {
                annotations = getScalarsAndEnums(value['annotations'], info.schema.getType("_InputToAnnotate" + edge));
                annotations['_creationDate'] = date.valueOf();
            }

            if (graphql.isInterfaceType(innerFieldType)) {
                // interface
                if (value['connect']) {
                    validateType(ctxt, value['connect'], innerFieldType, info.schema);
                    let typeToConnect = value['connect'].split('/')[0];
                    // add edge
                    ctxt.trans.code.push(`if(db._collection('${typeToConnect}').exists('${value['connect']}')){`);
                    ctxt.trans.code.push(`   db._query(aql\`INSERT {_from: ${from}._id, _to: "${value['connect']}" ${convertToInputAppendString(annotations)}} IN ${edgeCollection} RETURN NEW\`);`);
                    ctxt.trans.code.push(`} else { `);
                    ctxt.trans.code.push(`   throw "${value['connect']} does not exist in ${typeToConnect}";`);
                    ctxt.trans.code.push(`}`);
                } else {
                    // create
                    let key = Object.keys(value)[0];
                    if (key == "annotations") {
                        // In case the user actually specifies the annotations before the edge
                        key = Object.keys(value)[1];
                    }
                    let typeToCreate = key.replace(/^create(.+)$/, '$1');
                    let to = asAQLVar(getVar(ctxt)); // reference to the object to be added
                    create(false, ctxt, value[key], info.schema.getType(typeToCreate), info);
                    ctxt.trans.code.push(`db._query(aql\`INSERT {_from: ${from}._id, _to: ${to}._id ${convertToInputAppendString(annotations)}} IN ${edgeCollection} RETURN NEW\`);`);
                }
            } else {
                // type
                if (value['connect']) {
                    validateType(ctxt, value['connect'], innerFieldType, info.schema);
                    let typeToConnect = value['connect'].split('/')[0];
                    // add edge
                    ctxt.trans.code.push(`if(db._collection('${typeToConnect}').exists('${value['connect']}')){`);
                    ctxt.trans.code.push(`   db._query(aql\`INSERT {_from: ${from}._id, _to: "${value['connect']}" ${convertToInputAppendString(annotations)}} IN ${edgeCollection} RETURN NEW\`);`);
                    ctxt.trans.code.push(`} else { `);
                    ctxt.trans.code.push(`   throw "${value['connect']} does not exist in ${typeToConnect}";`);
                    ctxt.trans.code.push(`}`);
                } else { // create
                    let to = asAQLVar(getVar(ctxt)); // reference to the object to be added
                    create(false, ctxt, value['create'], innerFieldType, info);
                    ctxt.trans.code.push(`db._query(aql\`INSERT {_from: ${from}._id, _to: ${to}._id ${convertToInputAppendString(annotations)}} IN ${edgeCollection} RETURN NEW\`);`);
                }
            }
        }
    }

    // directives handling
    addFinalDirectiveChecksForType(ctxt, returnType, aql`${asAQLVar(resVar)}._id`, info.schema);

    // if root then bind result to variable
    if(isRoot) {
        ctxt.trans.code.push(`result['${info.path.key}'] = ${resVar};`);
        getVar(ctxt, true);
        // remove this field from pending response fields
        const index = ctxt.responseFields.indexOf(info.path.key);
        if (index > -1) {
            ctxt.responseFields.splice(index, 1);
        }
    }

    // when response fields are empty execute transaction
    if(isRoot && ctxt.responseFields.length === 0 && ctxt.trans.open){
        executeTransaction(ctxt).then(
            () => console.debug("Executed transaction"),
            (err) => console.error(err)
        );
    }

    // return promises for roots and null for nested result
    if(isRoot) {
        return getResultPromise(ctxt, info.path.key);
    } else {
        return null;
    }

}

function getResultPromise(ctxt, key) {
    return new Promise(function (resolve, reject) {
        (function waitForResult(){
            if(ctxt.trans.error !== undefined) {
                throw ctxt.trans.error;
            }
            if(ctxt.trans.results !== undefined){
                return resolve(ctxt.trans.results[key]);
            }
            setTimeout(waitForResult, 10);
        })();
    });
}

async function createEdge(isRoot, ctxt, source, sourceType, sourceField, target, targetType, annotations, info){
    // define transaction object
    if(ctxt.trans === undefined) ctxt.trans = initTransaction();

    // is root op and mutation is already queued
    if(isRoot && ctxt.trans.queue[info.path.key]){
        if(ctxt.trans.open) await executeTransaction(ctxt);
        if(ctxt.trans.error){
            if(ctxt.trans.errorReported) return null;
            ctxt.trans.errorReported = true;
            throw ctxt.trans.error;
        }
        return ctxt.trans.results[info.path.key]; // return the result
    }
    let returnTypeName = info.returnType.name.substr(1);
    ctxt.trans.write.add(returnTypeName);
    await validateEdge(ctxt, source, sourceType, sourceField, target, targetType, info);

    // variable reference to object that will be created
    let resVar = getVar(ctxt,false); // Note: This should not increment the var counter, but use the previously allocated var name.

    // add doc
    let doc = {};
    if(annotations !== undefined) {
        doc = annotations;
    }
    doc = formatFixInput(doc, doc, info.returnType);
    doc['_from'] = source;
    doc['_to'] = target;
    let date = new Date();
    doc['_creationDate'] = date.valueOf();
    let docVar = getParamVar(ctxt);
    let aqlDocVar = asAQLVar(`params.${docVar}`);
    let collection = asAQLVar(`db.${returnTypeName}`);
    ctxt.trans.params[docVar] = doc;
    ctxt.trans.code.push(`let ${resVar} = db._query(aql\`INSERT ${aqlDocVar} IN ${collection} RETURN NEW\`).next();`);

    addFinalDirectiveChecksForType(ctxt, sourceType, source, info.schema);

    // overwrite the current action
    if(isRoot) {
        ctxt.trans.code.push(`result['${info.path.key}'] = ${resVar};`); // add root result
        ctxt.trans.queue[info.path.key] = true; // indicate that this mutation op has been added to the transaction
        getVar(ctxt); // increment varCounter
    }

    // return null, check executeFieldsSerially(...) in /node_modules/graphql/execution/execute.js for details
    return null;
}

async function validateEdge(ctxt, source, sourceType, sourceField, target, targetType, info) {

    let schema = info.schema;
    if(!isOfType(source, sourceType, schema)) {
        ctxt.trans.code.push(`throw \`Source object ${source} is not of type ${sourceType}\``);
        return
    }
    let sourceObject = await get(source, sourceType, schema);
    if(sourceObject === undefined) {
        ctxt.trans.code.push(`throw \`Source object ${source} does not exist in collection ${sourceType}\``);
        return
    }

    if(!isOfType(target, targetType, schema)) {
        ctxt.trans.code.push(`throw \`Target object ${target} is not of type ${targetType}\``);
        return
    }
    let targetObject = await get(target, targetType, schema);
    if(targetObject === undefined) {
        ctxt.trans.code.push(`throw \`Target object ${target} does not exist in collection ${targetType}\``);
        return
    }

    // now check for if we're inserting an edge for a field that isn't a list and is already populated
    let fieldType = schema.getType(sourceType).getFields()[sourceField].type;
    let collection = db.edgeCollection(getEdgeCollectionName(sourceType.name, sourceField));
    let query = [aql`FOR x IN 1..1 OUTBOUND ${source} ${collection}`];
    if(graphql.isListType(fieldType)){
        query.push(aql`FILTER(x._id == ${target})`);
    }
    query.push(aql`RETURN x`);
    const cursor = await db.query(aql.join(query));
    let otherEdge = await cursor.next();
    if(otherEdge !== undefined) {
        ctxt.trans.code.push(`throw \`Edge already exists for ${sourceField} from ${source}.\``);
    }
}

function asAQLVar(varName){
    return '${' + varName + '}';
}

function initTransaction(){
    return {
        write: new Set(), params: {}, open: true, queue: {},
        code: [
            'const db = require("@arangodb").db;',
            'const {aql} = require("@arangodb");',
            'let result = Object.create(null);'
        ],
        finalConstraintChecks: []
    };
}

async function executeTransaction(ctxt){
    // verify that transaction is still open
    if(!ctxt.trans.open){
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
        //console.debug(action);
        ctxt.trans.results = await db.transaction(
            { write: Array.from(ctxt.trans.write), read: [] },
            action,
            ctxt.trans.params);
    } catch (e) {
        ctxt.trans.error = new ApolloError(e.message);
    }
}

function validateKey(ctxt, data, type, schema, id=undefined){
    let collection = asAQLVar(`db.${type.name}`);
    let keyType = schema["_typeMap"][getKeyName(type.name)];
    if (keyType) {
        let check = `if(db._query(aql\`FOR i IN ${collection} `;
        // make param
        // add data[field_name] to ctxt.params
        // replace data[field_name] with param
        for (let field_name in keyType._fields) {
            check += `FILTER(i.${field_name} == "${data[field_name]}") `;
        }
        if (id) {
            check += `FILTER(i._id != "${id}") `;
        }
        check += `return i\`).next()){ throw \`Duplicate key for ${type}\`; }`;
        ctxt.trans.code.push(check);
    }
}

function validateType(ctxt, id, type, schema){
    if(graphql.isInterfaceType(type)) {
        if(!isImplementingType(id.split('/')[0], type, schema)) {
            ctxt.trans.code.push(`throw "ID ${id} is not a document of the interface ${type}";`);
        }
    } else if(id.split('/')[0] != type.name){
        ctxt.trans.code.push(`throw "ID ${id} is not a document of the type ${type}";`);
    }
}

async function update(isRoot, ctxt, id, data, returnType, info) {
    // define transaction object
    if (ctxt.trans === undefined) ctxt.trans = initTransaction();

    // is root op and mutation is already queued
    if (isRoot && ctxt.trans.queue[info.path.key]) {
        if (ctxt.trans.open) await executeTransaction(ctxt);
        if (ctxt.trans.error) {
            if (ctxt.trans.errorReported) return null;
            ctxt.trans.errorReported = true;
            throw ctxt.trans.error;
        }
        return ctxt.trans.results[info.path.key]; // return the result
    }

    // 1) Recreate key based on 'id'
    // 2) Update key based on 'data'
    // 3) Add key check to transaction
    let keyName = getKeyName(returnType.name);
    let keyType = info.schema["_typeMap"][keyName];
    if (keyType) {
        try {
            let collection = db.collection(returnType);
            const cursor = await db.query(aql`FOR i IN ${collection} FILTER(i._id == ${id}) RETURN i`);
            let doc = await cursor.next();
            if (doc == undefined) {
                throw new ApolloError(`ID ${id} is not a document in the type ${returnType}`);
            }

            let key = {};
            for (let f in keyType._fields) {
                key[f] = doc[f];
                if (data[f] !== undefined) {
                    key[f] = data[f];
                }
            }
            validateKey(ctxt, key, returnType, info.schema, id);
        } catch (err) {
            throw new ApolloError(err);
        }
    }


    // add doc
    // Do not increment the var counter
    let resVar = getVar(ctxt, false);
    let doc = getScalarsAndEnums(data, returnType);
    //Update lastUpdateDate
    let date = new Date();
    doc['_lastUpdateDate'] = date.valueOf();
    let docVar = getParamVar(ctxt);
    ctxt.trans.write.add(returnType.name);
    ctxt.trans.params[docVar] = doc;
    ctxt.trans.code.push(`let ${resVar} = db._update("${id}", ${JSON.stringify(doc)}, {returnNew: true});`);

    // for edges
    let ob = pick(data, getObjectOrInterfaceFields(returnType));
    for (let f in ob) {
        let nestedReturn = returnType.getFields()[f].type;
        let nestedReturnType = graphql.getNamedType(nestedReturn);
        let edge = getEdgeCollectionName(returnType.name, f);
        ctxt.trans.write.add(edge);
        let edgeCollection = asAQLVar(`db.${edge}`);
        // remove old edges
        ctxt.trans.code.push(`db._query(aql\`FOR v IN ${edge} FILTER(v._from == "${id}") REMOVE v IN ${edgeCollection}\`);`);

        let values = Array.isArray(ob[f]) ? ob[f] : [ob[f]];
        for (let i in values) {
            let value = values[i];

            // Prepare annotations
            let annotations = null;
            if (value['annotations']) {
                annotations = getScalarsAndEnums(value['annotations'], info.schema.getType("_InputToAnnotate" + edge));
                annotations['_creationDate'] = date.valueOf();
            }

            if (graphql.isInterfaceType(nestedReturnType)) {
                // interface field
                if (value['connect']) {
                    // connect
                    let typeToConnect = value['connect'].split('/')[0];
                    if (!isImplementingType(typeToConnect, nestedReturnType, info.schema)) {
                        conditionalThrow(`ID ${value.connect} is not a document in the interface ${nestedReturnType}`);
                    }
                    // add edge
                    if (!disableEdgeValidation) { // check the database
                        ctxt.trans.code.push(`if(db._collection('${typeToConnect}').exists('${value['connect']}')){`);
                        ctxt.trans.code.push(`db._query(aql\`INSERT {_from: "${id}", _to: "${value['connect']}" ${convertToInputAppendString(annotations)}} IN ${edgeCollection} RETURN NEW\`);`);
                        ctxt.trans.code.push(`} else { throw "${value['connect']} does not exist in ${typeToConnect}"; }`);
                    } else {
                        console.warn(`Adding connection to ${value['connect']} in ${edge} without validating ID`);
                        ctxt.trans.code.push(`db._query(aql\`INSERT {_from: "${id}", _to: "${value['connect']}" ${convertToInputAppendString(annotations)}} IN ${edgeCollection} RETURN NEW\`);`);
                    }
                } else {
                    // create
                    let key = Object.keys(value)[0];
                    let typeToCreate = key.replace(/^create(.+)$/, '$1');
                    if (!isImplementingType(typeToCreate, nestedReturnType, info.schema)) {
                        conditionalThrow(`${key} is not a valid field`); // will never be thrown!
                    }
                    let to = asAQLVar(getVar(ctxt)); // reference to the object to be added
                    await create(false, ctxt, value[key], info.schema.getType(typeToCreate), info);
                    ctxt.trans.code.push(`db._query(aql\`INSERT {_from: "${id}", _to: ${to}._id ${convertToInputAppendString(annotations)}} IN ${edgeCollection} RETURN NEW\`);`);
                }
            } else {
                // type field
                if (value['connect']) {
                    // connect
                    let typeToConnect = value['connect'].split('/')[0];
                    if (typeToConnect != nestedReturnType.name) {
                        conditionalThrow(`ID ${value.connect} is not a document in the type ${nestedReturnType}`);
                    }
                    // add edge
                    if (!disableEdgeValidation) { // check the database
                        ctxt.trans.code.push(`if(db._collection('${typeToConnect}').exists('${value['connect']}')){`);
                        ctxt.trans.code.push(`db._query(aql\`INSERT {_from: "${id}", _to: "${value['connect']}" ${convertToInputAppendString(annotations)}} IN ${edgeCollection} RETURN NEW\`);`);
                        ctxt.trans.code.push(`} else { throw "${value['connect']} does not exist in ${typeToConnect}"; }`);
                    } else {
                        console.warn(`Adding connection to ${value['connect']} in ${edge} without validating ID`);
                        ctxt.trans.code.push(`db._query(aql\`INSERT {_from: "${id}", _to: "${value['connect']}" ${convertToInputAppendString(annotations)}} IN ${edgeCollection} RETURN NEW\`);`);
                    }
                } else {
                    // create
                    let to = asAQLVar(getVar(ctxt)); // reference to the object to be added
                    await create(false, ctxt, value['create'], nestedReturnType, info);
                    ctxt.trans.code.push(`db._query(aql\`INSERT {_from: "${id}", _to: ${to}._id ${convertToInputAppendString(annotations)}} IN ${edgeCollection} RETURN NEW\`);`);
                }
            }
        }
    }

    // directives handling
    addFinalDirectiveChecksForType(ctxt, returnType, aql`${asAQLVar(resVar)}._id`, info.schema);

    // overwrite the current action
    if (isRoot) {
        ctxt.trans.code.push(`result['${info.path.key}'] = ${resVar}.new;`); // add root result
        ctxt.trans.queue[info.path.key] = true; // indicate that this mutation op has been added to the transaction
        getVar(ctxt); // increment varCounter
    }

    // return null, check executeFieldsSerially(...) in /node_modules/graphql/execution/execute.js for details
    return null;
}

function asAqlArray(array){
    let q = [aql`[`];
    for(let i in array){
        if(i != 0){
            q.push(aql`,`);
        }
        q.push(aql`${array[i]}`);
    }
    q.push(aql`]`);
    return q;
}

/**
 * Converts all values of enum or scalar type in inputDoc to mach format used for storage in the database,
 * and return result in output map
 * @param {map} outputDoc
 * @param {map} inputDoc
 * @param type
 * @returns {map} outputDoc
 */
function formatFixInput(outputDoc, inputDoc, type) {
    // Adds scalar/enum values to outputDoc
    for (let f in type.getFields()) {
        let field = type.getFields()[f];
        //let field = type.getFields()[i];
        let t = graphql.getNamedType(field.type);
        if (graphql.isEnumType(t) || graphql.isScalarType(t)) {
            if (inputDoc[field.name] !== undefined) {
                outputDoc[field.name] = formatFixVariable(t, inputDoc[field.name]);
            }
        }
    }
    return outputDoc;
}

/**
 * Convert input data (value) to match format used for storage in the database
 * @param type (of field)
 * @param value
 * @returns value (in database ready format)
 */
function formatFixVariable(_type, v) {
    // DateTime has to be handled separately, which is currently the only reason for this function to exist
    if (_type == 'DateTime')
        // Arrays of DateTime needs special, special care.
        if (Array.isArray(v)) {
            let newV = []
            for (date of v)
                newV.push(aql`DATE_TIMESTAMP(${date})`);
            return newV;
        }
        else
            return aql`DATE_TIMESTAMP(${v})`;
    else
        return v;
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

function getFilters(filter_arg, type_to_filter) {
    let filters = [];
    for (let i in filter_arg) {
        let filter = filter_arg[i];
        /// Rewrite id field
        if (i == 'id') { i = '_id'; }

        // AND expression
        if (i == '_and') {
            let f = [];
            f.push(aql`(`);
            for (let x in filter) {
                if (x != 0) {
                    f.push(aql`AND`);
                }
                let arr = getFilters(filter[x], type_to_filter);
                for (let j in arr) {
                    f = f.concat(arr[j]);
                }
            }
            f.push(aql`)`);
            filters.push(f);
        }

        // OR expression
        if (i == '_or') {
            let f = [];
            f.push(aql`(`);
            for (let x in filter) {
                if (x != 0) {
                    f.push(aql`OR`);
                }
                let arr = getFilters(filter[x], type_to_filter);
                for (let j in arr) {
                    f = f.concat(arr[j]);
                }
            }
            f.push(aql`)`);
            filters.push(f);
        }

        // NOT expression
        if (i == '_not') {
            let f = [];
            f.push(aql`NOT (`);
            let arr = getFilters(filter, type_to_filter);
            for (let j in arr) {
                f = f.concat(arr[j]);
            }
            f.push(aql`)`);
            filters.push(f);
        }

        if (filter._eq != null) {
            let preparedArg = formatFixVariableWrapper(i, type_to_filter, filter._eq);
            filters.push([aql`x.${i} == ${preparedArg}`]);
        }
        if (filter._neq != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._neq);
            filters.push([aql`x.${i} != ${preparedArgs}`]);
        }
        if (filter._gt != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._gt);
            filters.push([aql`x.${i} > ${preparedArgs}`]);
        }
        if (filter._egt != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._egt);
            filters.push([aql`x.${i} >= ${preparedArgs}`]);
        }
        if (filter._lt != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._lt);
            filters.push([aql`x.${i} < ${preparedArgs}`]);
        }
        if (filter._elt != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._elt);
            filters.push([aql`x.${i} <= ${preparedArgs}`]);
        }
        if (filter._in != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._in)
            let q = [];
            q = q.concat([aql`x.${i} IN `]);
            q = q.concat(asAqlArray(preparedArgs));
            filters.push(q);
        }
        if (filter._nin != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._nin);
            let q = [];
            q = q.concat([aql`x.${i} NOT IN `]);
            q = q.concat(asAqlArray(preparedArgs));
            filters.push(q);
        }

        if (filter._like != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._like);
            filters.push([aql`LIKE(x.${i}, ${preparedArgs}, false)`]);
        }
        if (filter._ilike != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._ilike);
            filters.push([aql`LIKE(x.${i}, ${preparedArgs}, true)`]);
        }
        if (filter._nlike != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._nlike);
            filters.push([aql`NOT LIKE(x.${i}, ${preparedArgs}, false)`]);
        }
        if (filter._nilike != null) {
            let preparedArgs = formatFixVariableWrapper(i, type_to_filter, filter._nilike);
            filters.push([aql`NOT LIKE(x.${i}, ${preparedArgs}, true)`]);
        }

    }

    return filters;
}

async function getByKey(key, returnType){
    let type = graphql.getNamedType(returnType);
    let query = [aql`FOR x IN`];
    let collection = db.collection(type.name);
    query.push(aql`${collection}`);

    // add key filters
    for (let field_name in key) {
        let field_value = key[field_name];
        query.push(aql`FILTER(x.${field_name} == ${field_value})`);
    }
    query.push(aql`RETURN x`);
    try {
        const cursor = await db.query(aql.join(query));
        return await cursor.next();
    } catch(err) {
        //console.error(err);
        throw new ApolloError(err);
    }
}

async function getList(args, info){
    let type = graphql.getNamedType(info.returnType.getFields()['content'].type);
    let first = args.first;
    let after = args.after;
    let query = [aql`FOR x IN FLATTEN(FOR i IN [`];
    addPossibleTypes(query, info.schema, type);
    query.push(aql`] RETURN i)`);

    // add filters
    let query_filters = [];
    if(args.filter != undefined && !isEmptyObject(args.filter)){
        let filters = getFilters(args.filter, type);
        if(filters.length > 0) {
            query_filters.push(aql`FILTER`);
            for (let i in filters) {
                if (i != 0) {
                    query_filters.push(aql`AND`);
                }
                query_filters = query_filters.concat(filters[i]);
            }
        }
    }
    query = query.concat(query_filters);
    query.push(aql`FILTER(x._id > ${after}) SORT x._id LIMIT ${first} RETURN x`);
    try {
        const cursor = await db.query(aql.join(query));
        let result = await cursor.all();
        let list = {
            '_filter': query_filters, // needed to resolve isEndOfList and totalLength
            'content': result
        };
        return list;
    } catch(err) {
        //console.error(err);
        throw new ApolloError(err);
    }
}

async function isEndOfList(parent, args, info){
    let type = graphql.getNamedType(info.parentType.getFields()['content'].type);
    let query = [aql`FOR x IN FLATTEN(FOR i IN [`];
    addPossibleTypes(query, info.schema, type);
    query.push(aql`] RETURN i)`);

    // add filters
    if(parent._filter){
        query = query.concat(parent._filter);
    }
    // get last ID in parent content
    if(parent.content.length != 0){
        const last = parent.content[parent.content.length-1];
        query.push(aql`FILTER(x._id > ${last._id})`);
    }

    query.push(aql`SORT x._id COLLECT WITH COUNT INTO length RETURN length`);
    try {
        const cursor = await db.query(aql.join(query));
        const result = await cursor.next();
        return result == 0;
    } catch(err) {
        console.error(err);
        throw new ApolloError(err);
    }
}

async function getTotalCount(parent, args, info){
    let type = graphql.getNamedType(info.parentType.getFields()['content'].type);
    let query = [aql`FOR x IN FLATTEN(FOR i IN [`];
    addPossibleTypes(query, info.schema, type);
    query.push(aql`] RETURN i)`);

    // add filters
    if(parent._filter){
        query = query.concat(parent._filter);
    }

    query.push(aql`COLLECT WITH COUNT INTO length RETURN length`);
    try {
        const cursor = await db.query(aql.join(query));
        return await cursor.next();
    } catch(err) {
        console.error(err);
        throw new ApolloError(err);
    }
}

/**
 * Get type or interface by ID.
 * @param id
 * @param returnType
 * @param schema
 * @returns {Promise<*>}
 */
async function get(id, returnType, schema){
    let type = returnType;
    let query = [aql`FOR i IN`];
    if(graphql.isInterfaceType(type)){
        let possible_types = schema.getPossibleTypes(type);
        if(possible_types.length > 1){
            query.push(aql`UNION(`);
        }
        for(let i in possible_types) {
            if(i != 0){
                query.push(aql`,`);
            }
            let collection = db.collection(possible_types[i].name);
            query.push(aql`(FOR x IN ${collection} FILTER(x._id == ${id}) RETURN x)`);
        }
        if(possible_types.length > 1){
            query.push(aql`)`);
        }
    } else {
        let collection = db.collection(type.name);
        query.push(aql`${collection} FILTER(i._id == ${id})`);
    }

    query.push(aql` RETURN i`);
    try {
        const cursor = await db.query(aql.join(query));
        return await cursor.next();
    } catch(err) {
        console.error(err);
        throw new ApolloError(err);
    }
}

function isEmptyObject(obj) {
    return !Object.keys(obj).length;
}

/**
 * Copy a subset of an objects fields into a new object. The function ignores fields that are undefined.
 * @param ob
 * @param props
 */
function pick(ob, props){
    let sub = {};
    for(let i in props) {
        let prop = props[i];
        if(ob[prop] !== undefined) {
            sub[prop] = ob[prop];
        }
    }
    return sub;
}

function getVar(context, increment=true){
    if(context.varCounter === undefined){
        context.varCounter = 0;
    }
    if(increment) context.varCounter++;
    return `x${context.varCounter}`;
}

function getParamVar(context){
    if(context.paramCounter === undefined){
        context.paramCounter = 0;
    }
    context.paramCounter++;
    return `p${context.paramCounter}`;
}

function getTypeNameFromId(id) {
    return id.split('/')[0];
}

function isOfType(id, type, schema) {
    let idType = getTypeNameFromId(id);
    if(type.name == idType || isImplementingType(idType, type, schema)){
        return true;
    }
    return false;
}

function isImplementingType(name, type_interface, schema){
    let possible_types = schema.getPossibleTypes(type_interface);
    for (let i in possible_types) {
        if (possible_types[i].name == name) {
            return true;
        }
    }
    return false;
}

function conditionalThrow(msg){
    //console.warn(msg);
    if(!disableEdgeValidation){
        throw msg;
    }
}

/**
 * Add all possible collections for the given type to query
 * @param query (modifies)
 * @param schema
 * @param type
 * @param {bool} use_aql = true (optional)
 */
function addPossibleTypes(query, schema, type, use_aql = true) {
    if (graphql.isInterfaceType(type)) {
        let possible_types = schema.getPossibleTypes(type);
        for (let i in possible_types) {
            if (i != 0) {
                if (use_aql) query.push(aql`,`);
                else query[query.length - 1] += `,`;
            }
            if (use_aql) query.push(aql`${db.collection(possible_types[i].name)}`);
            else {
                let collection = asAQLVar(`db.${possible_types[i].name}`)
                query.push(`${collection}`);
            }
        }
    } else {
        if (use_aql) query.push(aql`${db.collection(type.name)}`);
        else {
            let collection = asAQLVar(`db.${type.name}`);
            query.push(`${collection}`);
        }
    }
}

/**
 * Add all possible edge-collections for the given type and field to query
 * @param query (modifies)
 * @param schema
 * @param type_name
 * @param field_name
 * @param {bool} use_aql = true (optional)
 * @param directionString (optional)
 */
function addPossibleEdgeTypes(query, schema, type_name, field_name, use_aql = true, directionString = "") {
    let type = schema._typeMap[type_name];
    if (graphql.isInterfaceType(type)) {
        let possible_types = schema.getPossibleTypes(type);
        for (let i in possible_types) {
            if (i != 0) {
                if (use_aql) query.push(aql`,`);
                else query[query.length - 1] += `,`;
            }
            let collectionName = getEdgeCollectionName(possible_types[i].name, field_name);

            if (use_aql) query.push(aql`${db.collection(collectionName)}`);
            else {
                let collection = asAQLVar(`db.${collectionName}`);
                query.push(`${collection}`);
            }
        }
    } else {
        let collectionName = getEdgeCollectionName(type.name, field_name);

        if (use_aql) query.push(aql`${db.collection(collectionName)}`);
        else {
            let collection = asAQLVar(`db.${type.name}`);
            query.push(`${collection}`);
        }
    }
}

/**
 * Append finalConstraintChecks to ctxt for all directives of all fields in input type
 * @param ctxt (modifies)
 * @param type
 * @param resVar
 * @param schema
 */
function addFinalDirectiveChecksForType(ctxt, type, id, schema) {
    if (!disableDirectivesChecking) {
        for (let f in type.getFields()) {
            let field = type.getFields()[f];
            for (dir of field.astNode.directives) {
                if (dir.name.value == 'noloops') {
                    let collection = asAQLVar(`db.${getEdgeCollectionName(type.name, field.name)}`);
                    ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR v IN 1..1 OUTBOUND ${id} ${collection} FILTER ${id} == v._id RETURN v\`).next()){`);
                    ctxt.trans.finalConstraintChecks.push(`   throw "Field ${f} in ${type.name} is breaking a @noloops directive!";`);
                    ctxt.trans.finalConstraintChecks.push(`}`);
                }
                else if (dir.name.value == 'distinct') {
                    let collection = asAQLVar(`db.${getEdgeCollectionName(type.name, field.name)}`);
                    ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR v, e IN 1..1 OUTBOUND ${id} ${collection} FOR v2, e2 IN 1..1 OUTBOUND ${id} ${collection} FILTER v._id == v2._id AND e._id != e2._id RETURN v\`).next()){`);
                    ctxt.trans.finalConstraintChecks.push(`   throw "Field ${f} in ${type.name} is breaking a @distinct directive!";`);
                    ctxt.trans.finalConstraintChecks.push(`}`);
                }
                else if (dir.name.value == 'uniqueForTarget') {
                    // The direct variant of @uniqueForTarget
                    // edge is named after current type etc.
                    let collection = asAQLVar(`db.${getEdgeCollectionName(type.name, field.name)}`);
                    ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR v, e IN 1..1 OUTBOUND ${id} ${collection} FOR v2, e2 IN 1..1 INBOUND v._id ${collection} FILTER e._id != e2._id RETURN v\`).next()){`);
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
                    addPossibleEdgeTypes(ctxt.trans.finalConstraintChecks, schema, interfaceName, field.name, false);
                    ctxt.trans.finalConstraintChecks.push(`FOR v2, e2 IN 1..1 INBOUND v._id`);
                    addPossibleEdgeTypes(ctxt.trans.finalConstraintChecks, schema, interfaceName, field.name, false);
                    ctxt.trans.finalConstraintChecks.push(`FILTER e._id != e2._id RETURN v\`).next()){`);
                    ctxt.trans.finalConstraintChecks.push(`   throw "Field ${f} in ${type.name} is breaking a @_uniqueForTarget_AccordingToInterface directive!";`);
                    ctxt.trans.finalConstraintChecks.push(`}`);
                }
                else if (dir.name.value == 'requiredForTarget') {
                    // The direct variant of @requiredForTarget
                    // edge is named after current type etc.
                    let edgeCollection = asAQLVar(`db.${getEdgeCollectionName(type.name, field.name)}`);

                    // The target type might be an interface, giving us slightly more to keep track of
                    // First, find the right collections to check
                    ctxt.trans.finalConstraintChecks.push(`if(db._query(aql\`FOR x IN FLATTEN(FOR i IN [`);
                    addPossibleTypes(ctxt.trans.finalConstraintChecks, schema, graphql.getNamedType(field.type), false);
                    // Second, count all edges ending at objects in these collections
                    ctxt.trans.finalConstraintChecks.push(`] RETURN i) LET endpoints = ( FOR v IN 1..1 INBOUND x ${edgeCollection} RETURN v)`);
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
                    addPossibleTypes(ctxt.trans.finalConstraintChecks, schema, graphql.getNamedType(field.type), false);
                    // Second, count all edges ending at objects in these collections
                    ctxt.trans.finalConstraintChecks.push(`] RETURN i) LET endpoints = ( FOR v IN 1..1 INBOUND x `);
                    addPossibleEdgeTypes(ctxt.trans.finalConstraintChecks, schema, interfaceName, field.name, false);
                    ctxt.trans.finalConstraintChecks.push(` RETURN v)`);
                    // If the count returns 0, we have an object breaking the directive
                    ctxt.trans.finalConstraintChecks.push(`FILTER LENGTH(endpoints) == 0 RETURN x\`).next()){`);
                    ctxt.trans.finalConstraintChecks.push(`   throw "There are object(s) breaking the inherited @_requiredForTarget_AccordingToInterface directive of Field ${f} in ${type.name}!";`);
                    ctxt.trans.finalConstraintChecks.push(`}`);
                }
                else if (dir.name.value == 'required' && field.name[0] == '_') {
                    // This is actually the reverse edge of a @requiredForTarget directive

                    let pattern_string = `^_(.+?)From${type.name}$`; // get the non-reversed edge name
                    let re = new RegExp(pattern_string);
                    let field_name = re.exec(field.name)[1];

                    ctxt.trans.finalConstraintChecks.push(`if(!db._query(aql\`FOR v IN 1..1 INBOUND ${id}`);
                    addPossibleEdgeTypes(ctxt.trans.finalConstraintChecks, schema, graphql.getNamedType(field.type), field_name, false);
                    ctxt.trans.finalConstraintChecks.push(`RETURN x\`).next()){`);
                    ctxt.trans.finalConstraintChecks.push(`   throw "Field ${f} in ${type.name} is breaking a @requiredForTarget directive (in reverse)!";`);
                    ctxt.trans.finalConstraintChecks.push(`}`);
                }
            }
        }
    }
}