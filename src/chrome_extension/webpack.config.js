const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: "production",

    context: __dirname,
    entry: './background',
    output: {
        path: path.join(__dirname, '../../dist/chrome_extension'),
        filename: 'background.js'
    },

    resolve: {
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
                from: 'manifest.json',
                to: path.join(__dirname, '../../dist/chrome_extension'),
            }
        ])
    ]
};
