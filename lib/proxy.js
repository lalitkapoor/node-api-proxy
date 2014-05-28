// Module dependencies

var Promise = require('bluebird')
var http = require('http')
var urlParser = require('url').parse
var zlib = require('zlib')
var request = require('request')
var mwTools = require('./middleware-tools')

/**
 * Proxy for RESTful JSON APIs with content rewrite support via middleware
 * @param  {Object} options
 * @param  {Object} options.url URL to proxy to
 * @param  {Object} options.middleware middleware config
 */
module.exports = function(options) {
  return http.createServer(function (req, res) {
    var url = options.url + (urlParser(req.url).search || '')

    var r = request({
      method: req.method.toLowerCase()
    , url: url
    , encoding: null
    }, function (error, response, body) {

      // copy headers
      for (var header in response.headers) {
        if (response.headers.hasOwnProperty(header)) {
          res.setHeader(header, response.headers[header])
        }
      }

      // res.setHeader('content-encoding', '')
      res.removeHeader('etag') // prevent caching
      res.removeHeader('content-length') // might change
      if (response.statusCode>= 200 && response.statusCode<300) {
        if (response.headers['content-encoding'] === 'gzip') {
          try {
            zlib.gunzip(body, function (error, buffer) {
              var data = null;
              if (buffer) data = JSON.parse(buffer.toString())
              // FIX: currently api proxing too must have a results object
              mwTools.runMiddleware(options.middleware, data.results, function (error) {
                // re-encode
                zlib.gzip(new Buffer(JSON.stringify(data)), function (error, buffer) {
                  res.end(buffer)
                })
              })
            })
          } catch (error) { // error parsing json
            console.log(error.stack)
            res.end(body)
          }
        } else { // if content-encoding is not gzip
          try {
            var data = JSON.parse(body.toString())
            mwTools.runMiddleware(options.middleware, data.results, function (error) {
              res.end(JSON.stringify(data))
            })
          } catch (error) { // error parsing json
            console.log(error.stack)
            res.end(body)
          }
        }
      } else { // if response.statusCode not between 200 and 300
        res.end(body)
      }
    })

    req.pipe(r) // make request to original url
  })
}