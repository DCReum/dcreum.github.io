var path = require("path");

module.exports = {
  entry: path.resolve(__dirname, "src/main.js"),
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
      {
        test: /\.js$/,
        use: [{
          loader: "babel-loader",
          options: { presets: ['es2015'] }
        }]
      }, {
        test: /\.scss|.sass$/,
        use: ["style-loader", "css-loader", "sass-loader"]
      },
      { 
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, 
        use: "url-loader?limit=10000&mimetype=application/font-woff" 
      }, { 
        test: /\.(ttf|eot|svg|png)(\?v=[0-9]\.[0-9]\.[0-9])?$/, 
        use: "file-loader" 
      }
    ]
  }
};
