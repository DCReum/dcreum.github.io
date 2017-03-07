var webpack = require("webpack");
var path = require("path");

module.exports = {
  entry: "./src/main.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  },
  devtool: "source-map",
  resolve: {
    extensions: [".js"],
    modules: [
      path.resolve(__dirname, "src"),
      path.resolve(__dirname, "node_modules")
    ]
  },
  module: {
    rules: [
      { test: /\.js?$/, use: "babel-loader" },
      { test: /\.scss|.sass$/, use: ["style-loader", "css-loader", "sass-loader"] }
    ]
  }
};