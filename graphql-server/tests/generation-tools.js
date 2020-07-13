const client = require('apollo-server-testing');

const graphql = require('graphql');
const faker = require('faker');
const gql = require('graphql-tag');

module.exports = {
    makeInputToCreate: (type, schema, limit, includeOptional=true) => makeInputToCreate(type, schema, limit, includeOptional),
    jsonToGraphQL: (ob) => jsonToGraphQL(ob),
    inputObjectToObjectType: (ob) => inputObjectToObject(ob),
    getSubFields: (ob, limit) => getSubFields(ob, 0, limit),
    setSeed: (seed) => faker.seed(seed)
}


let scalarF = {
    'String' : faker.lorem.words,
    'Float' : Math.random,
    'Int' : faker.random.number,
    'Boolean' : faker.random.boolean,
    'Date' : faker.date.past
};

/**
 * Generate a random example input to create a certain type down to some arbitrary depth. After three levels, only
 * required fields will be included!
 *
 * @param type
 * @param parents
 */
function generateInput(type, depth=0, limit=3, include_optional){
    let ob = {};
    for(let field_name in type._fields){
        // skip reverse edges
        if(field_name.startsWith('_')){
            continue;
        }

        // generate value
        let value = null;
        let field = type._fields[field_name];
        let field_type = field.type;

        // skip optional
        if(!include_optional || depth >= limit){
            if(graphql.isNullableType(field_type)){
                continue;
            }
        }

        let named_type = graphql.getNamedType(field.type);
        if(graphql.isEnumType(named_type)){
            value = '__ENUM__' + faker.random.arrayElement(named_type.getValues()).name;
        } else if(graphql.isScalarType(named_type)){
            if(scalarF[named_type.name]){
                value = scalarF[named_type.name]();
            } else {
                value = scalarF['String']();
            }
        } else {
            // check for loop
            if(depth >= limit){
                value = {'connect' : `Dummy/${faker.random.number()}` }
            } else {
                let keys = [];
                value = {}
                for (let k in named_type._fields) {
                    if (k == 'connect') {
                        continue; // don't use connect 
                    }
                    if (k == 'annotations') {
                        value['annotations'] = generateInput(named_type._fields['annotations'].type, depth + 1, limit, include_optional);
                        continue; // don't use anntations as key 
                    }
                    keys.push(k); // add a create or createX field
                }
                // pick the create field or one of the createX fields
                let key = faker.random.arrayElement(keys);
                let t = named_type._fields[key].type;

                value[key] = generateInput(t, depth + 1, limit, include_optional);
            }
        }
        ob[field_name] = graphql.isListType(field_type) ? [value] : value;

    }
    return ob;
}

function makeInputToCreate(type, schema, limit, include_optional){
    let arg_type = schema._typeMap[`_InputToCreate${type.name}`]
    return generateInput(arg_type, 0, limit, include_optional);
}

/**
 * Returns a GraphQL formatted string, where any quoted props and enums are unquoted.
 * @param ob
 * @returns {Promise<any> | void | string}
 */
function jsonToGraphQL(ob){
    let string = JSON.stringify(ob, null, 2);
    string = string.replace(/\"([^(\")"]+)\":/g,"$1:");
    string = string.replace(/\"__ENUM__([^(\")"]+)\"/g,"$1");
    return string
}

/**
 * Substitute and flatten any nested connect/create field in a JSON object to form the corresponding type
 * representation.
 * @param ob
 * @returns
 */
function inputObjectToObject(ob){
    ob = copy(ob);
    let k = Object.keys(ob)[0];
    if(k === undefined){
        return ob;
    }

    if(k == 'connect'){
        return { id: ob['connect'] };
    } else if(k.startsWith('create')){
        return inputObjectToObject(ob[k]);
    } else {
        for(let i in ob){
            if(Array.isArray(ob[i])){
                let a = [];
                for(let j in ob[i]){
                    a.push(inputObjectToObject(ob[i][j]));
                }
                ob[i] = a;
            } else if(typeof ob[i] === "object"){
                ob[i] = inputObjectToObject(ob[i]);
            } else {
                continue;
            }
        }
    }

    return ob;
}


/**
 * Returns a GraphQL string representing the set of subfields present in GraphQL object.
 * @param ob
 */
function getSubFields(type, depth=0, limit=3){
    let subfields = ' { ';
    for(let f in type.getFields()){
        let t = graphql.getNamedType(type.getFields()[f].type);

        if((graphql.isObjectType(t) || graphql.isInterfaceType(t)) && depth >= limit){
            continue;
        }

        subfields += ` ${f} `;
        if(graphql.isObjectType(t) || graphql.isInterfaceType(t)){
            subfields += getSubFields(t, depth + 1, limit);
        }
    }
    subfields += ' } ';
    return subfields;
}

/**
 * Copy JSON type using stringify and parse.
 * @param x
 * @returns {any}
 */
function copy(x) {
    return JSON.parse(JSON.stringify(x));
}