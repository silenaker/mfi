const child_process = require("child_process");
const moment = require("moment");
const pkg = require("./package.json");
const dev = process.env.NODE_ENV === "development";

// plugins
const commonjsPlugin = require("@rollup/plugin-commonjs");
const nodeResolvePlugin = require("@rollup/plugin-node-resolve").default;
const typescriptPlugin = require("@rollup/plugin-typescript");
const replacePlugin = require("@rollup/plugin-replace");
const uglifyPlugin = require("rollup-plugin-uglify").uglify;
const bannerPlugin = require("rollup-plugin-banner").default;

const releaseInfoTemplate =
  "Name: {{name}}\nVersion: {{version}}\nCommit: {{commit}}\nRelease Date: {{date}}";

const formatTemplate = (data, template) =>
  template.replace(/{{\s*([a-zA-Z_]+)\s*}}/g, (m, k) =>
    data[k] !== undefined ? data[k] : m
  );

const revision = child_process.execSync("git rev-parse HEAD");

module.exports = {
  input: "src/index.ts",
  output: {
    name: "mfei",
    file: dev ? "umd/mfei.js" : "umd/mfei.min.js",
    format: "umd",
  },
  plugins: [
    commonjsPlugin(),
    nodeResolvePlugin({ browser: true }),
    typescriptPlugin(),
    replacePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    }),
    !dev && uglifyPlugin(),
    bannerPlugin(
      formatTemplate(
        {
          name: pkg.name,
          version: pkg.version,
          commit: revision.toString().trim(),
          date: moment().format("YYYY-MM-DD HH:mm:ss"),
        },
        releaseInfoTemplate
      )
    ),
  ],
};
