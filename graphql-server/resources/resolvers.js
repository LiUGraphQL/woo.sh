module.exports = {
    get: (options) => {
        return {
            Query: {
                helloWorld: () => 'Hello world!'
            }
        }
    }
};