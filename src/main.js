/**
 * A module to install and run the ios-webkit-debug-proxy.
 * @module node-ios-webkit-debug-proxy
 */

(function() {
  'use strict';

  var os = require('os'),
    path = require('path'),
    fs = require('fs'),
    mv = require('mv'),
    rimraf = require('rimraf'),
    Download = require('download'),
    child_process = require('child_process'),
    Q = require('q');

  var PACKAGE_VERSION = '1.4',
    PACKAGE_NAME = 'ios-webkit-debug-proxy-' + PACKAGE_VERSION,
    BINARY_NAME = 'ios_webkit_debug_proxy';

  var installDir = path.join(
      process.env[os.platform() === 'win32' ? 'USERPROFILE' : 'HOME'],
      '.node-ios-webkit-debug-proxy'
    );

  var downloadFile = function(url) {
    var deferred = Q.defer();

    var download = new Download({mode: '755'});

    download.get(url)
      .dest(installDir)
      .run(function(err, files) {
        if (err) {
          deferred.reject(err);
        }
        else {
          deferred.resolve(files[0].path);
        }
      });

    return deferred.promise;
  };

  var extractTarball = function(file) {
    var deferred = Q.defer(),
      proc = child_process.spawn('tar', ['xfz', file, '-C', installDir]),
      errorData = '';

    proc.stderr.on('data', function(chunk) {
      errorData += chunk;
    });

    proc.on('error', function(err) {
      deferred.reject(err);
    });

    proc.on('close', function(code) {
      if (code === 0) {
        deferred.resolve(path.join(installDir, PACKAGE_NAME));
      }
      else {
        deferred.reject(errorData);
      }
    });

    return deferred.promise;
  };

  var runCommand = function() {
    var deferred = Q.defer(),
      proc = child_process.spawn.apply(this, arguments),
      errorData = '',
      data = '';

    proc.stderr.on('data', function(chunk) {
      errorData += chunk;
    });

    proc.stdout.on('data', function(chunk) {
      data += chunk;
    });

    proc.on('error', function(err) {
      deferred.reject(err);
    });

    proc.on('close', function(code) {
      if (code === 0) {
        deferred.resolve(data);
      }
      else {
        deferred.reject(errorData);
      }
    });

    return deferred.promise;
  };

  var autogen = function(packageDir) {
    return runCommand('sh', ['autogen.sh'], {cwd: packageDir}).then(
      function() {
        return packageDir;
      }
    );
  };

  var configure = function(packageDir) {
    return runCommand('sh', ['configure'], {cwd: packageDir}).then(
      function() {
        return packageDir;
      }
    );
  };

  var compile = function(packageDir) {
    return runCommand('make', [], {cwd: packageDir}).then(
      function() {
        return path.join(packageDir, 'src', 'ios_webkit_debug_proxy');
      }
    );
  };

  var moveIntoPlace = function(binaryPath) {
    var deferred = Q.defer(),
      destination = path.join(installDir, path.basename(binaryPath));

    mv(binaryPath, destination, function(err) {
      if (err) {
        deferred.reject(err);
      }
      else {
        deferred.resolve(destination);
      }
    });

    return deferred.promise;
  };

  var remove = function(f) {
    var deferred = Q.defer();

    rimraf(f, function(err) {
      if (err) {
        deferred.reject(err);
      }
      else {
        deferred.resolve(f);
      }
    });

    return deferred.promise;
  };

  var clean = function() {
    return Q.all([
      remove(PACKAGE_VERSION + '.tar.gz'),
      remove(PACKAGE_NAME)
    ]);
  };

  var installLinux = function() {
    // Install for Linux. Will build from source so is bound to fail is dependencies are missing.
    var tarballUrl = 'https://github.com/google/ios-webkit-debug-proxy/archive/' + PACKAGE_VERSION + '.tar.gz';

    return downloadFile(tarballUrl)
      .then(extractTarball)
      .then(autogen)
      .then(configure)
      .then(compile)
      .then(moveIntoPlace)
      .then(clean).then(
        function() {
          return path.join(installDir, BINARY_NAME);
        }
      );
  };

  var installDarwin = function() {
  };

  var installWin = function() {
  };

  /**
   * Install proxy.
   *
   * @return {Promise}
   */
  var install = function() {
    switch (os.platform()) {
      case 'linux':
        return installLinux();
        break;
      case 'darwin':
        return installDarwin();
        break;
      case 'win':
        return installWin();
        break;
      default:
        return Q.reject('No such platform.');
    }
  };

  var uninstallLinux = function() {
    return remove(path.join(installDir, BINARY_NAME));
  };

  var uninstallDarwin = function() {
  };

  var uninstallWin = function() {
  };

  /**
   * Uninstall proxy.
   *
   * @return {Promise}
   */
  var uninstall = function() {
    switch (os.platform()) {
      case 'linux':
        return uninstallLinux();
        break;
      case 'darwin':
        return uninstallDarwin();
        break;
      case 'win':
        return uninstallWin();
        break;
      default:
        return Q.reject('No such platform.');
    }
  };

  /**
   * Check if proxy is installed.
   *
   * @return {Promise}
   */
  var isInstalled = function() {
    var deferred = Q.defer(),
      binaryPath = path.join(installDir, BINARY_NAME);

    fs.exists(path.join(installDir, BINARY_NAME), function(exists) {
      if (exists) {
        deferred.resolve(binaryPath);
      }
      else {
        deferred.reject('ios-webkit-debug-proxy is not installed.');
      }
    });

    return deferred.promise;
  };

  /**
   * @class WebKitProxy
   * @description
   *   Object used to stop and start the proxy.
   */
  var WebKitProxy = function() {};

  /**
   * @method
   * @memberof WebKitProxy
   * @description
   *   Start proxy.
   * @return {Promise}
   */
  WebKitProxy.prototype.start = function() {
    var startProcess = function() {
      var deferred = Q.defer();

      this._process = child_process.spawn(path.join(installDir, BINARY_NAME));

      var timeout = setTimeout(function() {
        this._process.removeAllListeners();
        deferred.resolve();
      }.bind(this), 200);

      this._process.on('error', function(arg) {
        deferred.reject(arg);
      });

      this._process.on('close', function(code) {
        deferred.reject()
      });

      return deferred.promise;
    }.bind(this);

    return isInstalled()
      .then(this.isRunning)
      .then(
        function() {
          return Q.resolve('Proxy is already running.');
        },
        function() {
          return startProcess();
        }
      );
  };

  /**
   * @method
   * @memberof WebKitProxy
   * @description
   *   Stop proxy.
   * @return {Promise}
   */
  WebKitProxy.prototype.stop = function() {
    var deferred = Q.defer();

    this.isRunning().then(
      function() {
        try {
          this._process.kill('SIGINT');
        }
        catch (e) {
          deferred.reject('Unable to stop proxy: ' + e);
        }

        deferred.resolve('Proxy is stopped.');
      }.bind(this),
      function() {
        deferred.resolve('Proxy is already stopped.');
      }
    );

    return deferred.promise;
  };

  /**
   * @method
   * @memberof WebKitProxy
   * @description
   *   Check if proxy is running.
   * @return {Promise}
   */
  WebKitProxy.prototype.isRunning = function() {
    var deferred = Q.defer();

    if (!this._process) {
      deferred.reject();
    }
    else {
      if (this._process.killed) {
        deferred.reject();
      }
      else {
        deferred.resolve();
      }
    }

    return deferred.promise;
  };

  module.exports = {
    install: install,
    uninstall: uninstall,
    isInstalled: isInstalled,
    WebKitProxy: WebKitProxy
  };
})();
