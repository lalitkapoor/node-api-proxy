// Module dependencies

var Promise = require('bluebird')
var request = require('request')
var async = require('async')
var npm = require('npm')

exports.runTransform = function (ware, arr, callback) {
  console.log('transform', ware.repo)
  async.map(arr, function (item, cb) {
    var func = ware.func.apply(null, ware.args || [])
    func(item[ware.field], item, arr, function (error, value) {
      item[ware.field] = value
      cb(null)
    })
  }, function (error) {
    if (error) return callback(error)
    return callback(null)
  })
}

exports.runFilter = function (ware, arr, callback) {
  console.log('filter', ware.repo)
  async.filter(arr, function (item, cb) {
    // we want the user to be able to access the entire item if they need it
    var obj = {field: ware.field, item: item}
    var func = ware.func.apply(null, ware.args || [])
    func(obj, cb)
  }, function (results) {
    // overwrite the array that arr references
    arr.length = 0 // iterate and pop for best performance instead
    Array.prototype.push.apply(arr, results)
    return callback(null)
  })
}

exports.runMiddleware = function(middleware, arr, callback) {
  // ware is a single piece of middleware
  async.mapSeries(middleware, function (ware, cb) {
    console.log(ware.field)
    if (ware.type === 'transform') {
      exports.runTransform(ware, arr[ware.collection], cb)
    } else if (ware.type === 'filter') {
      exports.runFilter(ware, arr[ware.collection], cb)
    } else {
      cb(null)
    }
  }, function (error) {
    if (error) return callback(error)
    callback(null)
  })
}

exports.installDependency = function (ware) {
  return new Promise(function (resolve, reject) {
    npm.load({}, function (error) {
      if (error) return reject(error)
      npm.commands.install([ware.repo], function (error, data) {
        if (error) return reject(error)
        var module = data.pop()[1].split('node_modules/')[1]
        ware.func = require(module)
        return resolve()
      })
    })
  })
}

exports.installDependencies = function (middleware) {
  var promises = middleware.map(function (ware) {
    return exports.installDependency(ware)
  })

  return Promise.all(promises)
}