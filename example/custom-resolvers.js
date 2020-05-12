module.exports = {
    get: function(options) {
        return {
            Query: {
                hello: async (parent, args, context, info) => "Custom function says hello!"
            }
        };
    }
};