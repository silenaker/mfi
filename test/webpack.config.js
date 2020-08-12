const path = require("path");

module.exports = {
  mode: "development",
  resolve: {
    extensions: [".mjs", ".js", ".ts", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        include: [path.resolve("src"), path.resolve("test")],
        loader: require.resolve("babel-loader"),
      },
    ],
  },
};
