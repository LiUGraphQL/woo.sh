module.exports = {
    get: (options) => {
        return {
            Query: {
                version: () => "X.Y.Z"
            }
        }
    }
};