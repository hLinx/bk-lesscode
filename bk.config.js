
const mdLoaderOption = require('./scripts/mark-dowm/md-loader-option')
const path = require('path')
const webpack = require('webpack')

module.exports = {
    assetsDir: './lib/client/static',
    outputDir: './lib/client/dist',
    port: process.env.BK_APP_PORT,
    host: process.env.BK_APP_HOST,
    publicPath: process.env.BK_STATIC_URL,
    typescript: true,
    bundleAnalysis: false,
    replaceStatic: true,
    parallel: 8,
    copy: {
        from: './lib/client/static',
        to: './lib/client/dist/static'
    },
    resource: {
        main: {
            entry: './lib/client/src/main.js',
            html: {
                filename: 'index.html',
                template: './lib/client/index.html'
            }
        },
        preview: {
            entry: './lib/client/src/preview/index.js',
            html: {
                filename: 'preview.html',
                template: './lib/client/preview.html'
            }
        }
    },
    // webpack config 配置
    configureWebpack () {
        const serverAddress = `http://${process.env.BK_APP_HOST}:${process.env.BK_APP_PORT - 1}`
        return {
            resolve: {
                alias: {
                    '@': path.resolve(__dirname, './lib/client/src'),
                    'shared': path.resolve(__dirname, './lib/shared')
                },
                fallback: {
                    buffer: require.resolve('buffer')
                }
            },
            devServer: {
                proxy: [
                    {
                        context (path) {
                            const proxyRegs = [
                                /^\/api/,
                                /\/component\/register.js$/,
                                /\/\d+\/component\/preview-register/
                            ]
                            return proxyRegs.some(reg => reg.test(path))
                        },
                        target: serverAddress
                    }
                ],
                historyApiFallback: {
                    rewrites: [
                        { from: /^\/$/, to: '/index.html' },
                        { from: /^\/preview\//, to: '/preview.html' }
                    ]
                }
            },
            optimization: {
                splitChunks: {
                    cacheGroups: {
                        toast: {
                            name: 'toast-ui',
                            test: /toast-ui/,
                            priority: 20,
                            chunks: 'all',
                            reuseExistingChunk: true
                        },
                        element: {
                            name: 'element-ui',
                            test: /element-ui/,
                            priority: 30,
                            chunks: 'all',
                            reuseExistingChunk: true
                        },
                        third: {
                            name: 'echarts-mavon-vant',
                            test: /(echarts)|(mavon-editor)|(vant)/,
                            priority: 40,
                            chunks: 'all',
                            reuseExistingChunk: true
                        }
                    }
                }
            }
        }
    },
    chainWebpack (config) {
        config.module
            .rule('md-loader')
            .test(/\.md$/)
            .use('vue-loader')
            .loader(require.resolve('vue-loader-bk'))
            .end()
            .use('md-loader')
            .loader(require.resolve('vue-markdown-loader/lib/markdown-compiler'))
            .options(mdLoaderOption)

        config.plugin('Buffer')
            .use(
                webpack.ProvidePlugin,
                [{
                    Buffer: ['buffer', 'Buffer']
                }]
            )
        return config
    }
}
