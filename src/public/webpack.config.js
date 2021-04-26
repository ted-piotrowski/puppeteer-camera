const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: "production",

    context: __dirname,
    entry: './index',
    output: {
        path: path.join(__dirname, '../../dist/public'),
        filename: 'main.js'
    },

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".jsx"]
    },

    module: {
        rules: [
            {
                test: /\.ts(x?)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader"
                    }
                ]
            },
        ]
    },

    plugins: [
        new CopyPlugin([
            {
                from: 'index.html',
                to: path.join(__dirname, '../../dist/public'),
            }
        ])
    ]
};
