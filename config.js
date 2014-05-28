require('dotenv').load()

var _ = require('lodash')

var config = {
  defaults: {
    port: process.env['PORT'] || 8000
  , url: process.env['URL'] // url we proxy too
  , configLink: process.env['CONFIG_LINK'] || null
  }

, dev: {
    env: 'dev'
  , isDev: true
  }

, prod: {
    env: 'prod'
  , isProd: true
  }
}

var env = process.env['ENV'] = process.env['ENV'] || 'dev'
if (!env || !config.hasOwnProperty(env)) env = 'dev'

module.exports = _.defaults(config[env], config.defaults)
console.log('Loading',  env, 'config')
