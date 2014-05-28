// Module dependencies

var config = require('./config')
var Promise = require('bluebird')
var request = require('request')
var proxy = require('./lib/proxy')
var mwTools = require('./lib/middleware-tools')

// 1. get list of dependencies from middleware.json
// 2. install dependencies
// 3. map middleware.repo to a required function
// 4. server proxy server w/middleware support
//    1. accept request, proxy to original, get response
//    2. if request method is GET/POST/PUT/PATCH after response, run through middleware
//    3. respond to original request

// consider breaking out middleware handling component into its own file

var middleware = null // load this with middleare config after downloading

if (!config.port) {
  console.error('PORT not configured')
  process.exit(1)
}

if (!config.url) {
  console.error('URL not configured')
  process.exit(1)
}

if (!config.configLink) {
  console.error('PROXY_CONFIG_LINK not configured')
  process.exit(1)
}

var downloadConfig = function (link, callback) {
  return new Promise(function (resolve, reject) {
    request.get(link, function (error, response, body) {
      if (error) return reject(error)
      return resolve(JSON.parse(body))
    })
  }).nodeify(callback)
}

downloadConfig(config.configLink) // download config
.then(function (config) { // load into var
  middleware = config.middleware
})
.then(function() { // install deps
  return mwTools.installDependencies(middleware)
})
.then(function () { // launch proxy
  return new Promise(function (resolve, reject) {
    proxy({url: config.url, middleware: middleware})
    .listen(config.port, function (error) {
      if (error) return reject(error)
      return resolve()
    })
  })
})
.then(function () {
  console.log('launched proxy on port', config.port)
})
.catch(function (error) {
  console.log('error occurred')
  if (error.stack) console.error(error.stack)
  process.exit(1)
})
