const path = require("path");

module.exports = {
  configureWebpack: {
    resolve: {
      alias: {
        "mfei": path.join(__dirname, "../../es/index.js")
      }
    }
  }
};
