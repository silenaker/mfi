const child_process = require("child_process");
const moment = require("moment");
const pkg = require("./package.json");
const dev = process.env.NODE_ENV === "development";

// plugins
const typescriptPlugin = require("@rollup/plugin-typescript");
const nodeResolvePlugin = require("@rollup/plugin-node-resolve").default;
const commonjsPlugin = require("@rollup/plugin-commonjs");
const replacePlugin = require("@rollup/plugin-replace");
// const babelPlugin = require("@rollup/plugin-babel").default;
const uglifyPlugin = require("rollup-plugin-uglify").uglify;
const bannerPlugin = require("rollup-plugin-banner").default;
const visualizerPlugin = require("rollup-plugin-visualizer");

const releaseInfoTemplate =
  "Name: {{name}}\nVersion: {{version}}\nCommit: {{commit}}\nRelease Date: {{date}}";

const formatTemplate = (data, template) =>
  template.replace(/{{\s*([a-zA-Z_]+)\s*}}/g, (m, k) =>
    data[k] !== undefined ? data[k] : m
  );

const revision = child_process.execSync("git rev-parse HEAD");

// babel polyfill are too large, we use typescript plugin directly
module.exports = {
  input: "src/index.ts",
  output: {
    name: "mfi",
    file: dev ? "umd/mfi.js" : "umd/mfi.min.js",
    format: "umd",
  },
  plugins: [
    typescriptPlugin(),
    nodeResolvePlugin({
      // use with babel plugin
      // extensions: [".mjs", ".js", ".jsx", ".json", ".ts"],
      browser: true,
    }),
    commonjsPlugin(),
    replacePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    }),
    // babelPlugin({
    //   rootMode: "upward",
    //   babelHelpers: "bundled",
    //   extensions: [".ts"],
    //   include: ["src/**/*.ts"],
    // }),
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
    dev && visualizerPlugin(),
  ],
};
