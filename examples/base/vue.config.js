const path = require("path");

module.exports = {
  configureWebpack: {
    resolve: {
      alias: {
        "mfi": path.join(__dirname, "../../dist/index.js")
      }
    }
  }
};
