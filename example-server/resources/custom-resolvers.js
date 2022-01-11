module.exports = {
    get: function(options) {
        return {
            Query: {
                version: async (parent, args, context, info) => "X.Y.Z"
            }
        };
    }
};