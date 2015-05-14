var path = require('path');
  chai = require('chai'),
  chaiAsPromised = require('chai-as-promised'),
  Q = require('q'),
  webkitProxy = require(path.join(__dirname, '..', 'src', 'main.js')),
  proxy = new webkitProxy.WebKitProxy();

chai.use(chaiAsPromised);

var should = chai.should();

describe('webkitProxy', function(){
  this.timeout(50000);

  it('should exist', function() {
    webkitProxy.should.be.a('object');
  });

  describe('#install()', function() {
    it('should install the proxy', function() {
      return webkitProxy.install()
        .then(webkitProxy.isInstalled)
        .should.be.fulfilled;
    });
  });

  describe('#uninstall()', function() {
    it('should remove the proxy', function() {
      return webkitProxy.uninstall()
        .then(webkitProxy.isInstalled)
        .should.be.rejected;
    });
  });

  describe('#WebKitProxy', function() {
    before(function(done) {
      webkitProxy.install().then(
        function() {
          done();
        }
      );
    });

    beforeEach(function(done) {
      proxy.stop().then(
        function() {
          done();
        }
      );
    });

    describe('#start()', function() {
      it ('should start the proxy', function() {
        return proxy.start()
          .then(proxy.isRunning)
          .should.be.fulfilled;
      });
    });

    describe('#stop()', function() {
      it('should stop the proxy', function() {
        return proxy.start()
          .then(proxy.stop)
          .then(proxy.isRunning)
          .should.be.rejected;
      });
    });
  });
});
