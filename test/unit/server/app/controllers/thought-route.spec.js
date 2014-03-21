/* jshint expr: true */
/* jshint -W079 */

(function () {
    'use strict';

    var assert = require('chai').assert,
        sinon = require('sinon'),
        DEFAULTS = require('config').Default,
        casual = require('casual'),
        proxyquire = require('proxyquire'),
        mongooseStub = require(DEFAULTS.testRoot + '/helpers/stubs/mongooseStub').mongoose;

    describe('/thought endpoint test suite', function () {
        var Repository = require(DEFAULTS.serverRoot + '/repositories/thoughts'),
            thoughtRoute = proxyquire(DEFAULTS.serverRoot + '/app/controllers/thought-route', {
                'mongoose': mongooseStub
            }),
            findByIdSuccessResult,
            findAllSuccessResult = [
                {_id: casual.word},
                {_id: casual.word}
            ],
            shouldFindMatch,
            saveCallback;

        function findCallback(id) {
            return {
                then: function (successCb, failureCb) {
                    if (shouldFindMatch) {
                        if(id) {
                            findByIdSuccessResult = { _id: id };
                            successCb(findByIdSuccessResult);
                        } else {
                            successCb(findAllSuccessResult);
                        }
                    } else {
                        failureCb('record not found');
                    }
                }
            };
        }

        function before() {
            sinon.spy(mongooseStub.Types, 'ObjectId');
            sinon.stub(Repository.prototype, 'findById', findCallback);
            sinon.stub(Repository.prototype, 'findAll', findCallback);
            sinon.stub(Repository.prototype, 'update', findCallback);
            sinon.stub(Repository.prototype, 'save').returns(
                {
                    then: function (callback) {
                        saveCallback = callback;
                    }
                }
            );
        }

        function after () {
            mongooseStub.Types.ObjectId.restore();
            Repository.prototype.findById.restore();
            Repository.prototype.findAll.restore();
            Repository.prototype.update.restore();
            Repository.prototype.save.restore();
        }

        function assertResponseWith(res, expectedStatus, responseBody) {
            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, expectedStatus);
            sinon.assert.calledOnce(responseBody);
        }

        function buildReqForFindWith(id) {
            return {
                params: {
                    id: id
                },
                body: {
                    title: casual.title
                }
            };
        }

        function buildResStub() {
            function format (types) {
                if(types.json) {
                    types.json();
                }
            }

            return {
                format: sinon.spy(format),
                json: sinon.stub(),
                status: sinon.stub(),
                send: sinon.stub()
            };
        }

        it('should return a 200 status code after a successful PUT', function () {
            var req = buildReqForFindWith('some id'),
                res = buildResStub(),
                expectedUpdateParams = { _id: req.params.id, title: req.body.title };

            shouldFindMatch = true;

            thoughtRoute.update(req, res);

            sinon.assert.calledOnce(Repository.prototype.update);
            sinon.assert.calledWith(Repository.prototype.update, expectedUpdateParams);

            sinon.assert.calledOnce(res.json);

            assert.isObject(res.json.getCall(0).args[0]);
        });

        it('should return a single thought given an id', function () {
            var existingId = 'some id',
                req = buildReqForFindWith(existingId),
                res = buildResStub(),
                result;

            shouldFindMatch = true;

            thoughtRoute.getById(req, res);

            sinon.assert.calledOnce(Repository.prototype.findById);
            sinon.assert.calledWith(Repository.prototype.findById, existingId);
            Repository.prototype.findById.calledBefore(res.json);

            sinon.assert.calledOnce(res.json);
            result = res.json.getCall(0).args[0];

            assert.strictEqual(result, findByIdSuccessResult);
        });

        it('should respond with a status code of 404 when a thought is not found', function () {
            var req = buildReqForFindWith('not found'),
                res = buildResStub(),
                expectedStatusCode = 404;

            shouldFindMatch = false;

            thoughtRoute.getById(req, res);

            sinon.assert.calledOnce(res.send);
            sinon.assert.calledWith(res.send, expectedStatusCode);
        });

        it('should create a new thought', function () {
            var thought = {
                    title: casual.title,
                    body: casual.text
                },
                req = {
                    body: thought
                },
                res = buildResStub(),
                jsonArgs;

            thoughtRoute.create(req, res);

            sinon.assert.calledOnce(Repository.prototype.save);
            sinon.assert.calledWith(Repository.prototype.save, thought);

            saveCallback(thought);

            assertResponseWith(res, 201, res.json);
            jsonArgs = res.json.getCall(0).args[0];
            assert.isDefined(jsonArgs[0].href);
        });

        it('should set and error status code when attempting to create an invalid thought', function () {
            var res = buildResStub();

            thoughtRoute.create({}, res);

            sinon.assert.notCalled(Repository.prototype.save);
            sinon.assert.calledOnce(res.status);
            sinon.assert.calledWith(res.status, 400);
        });

        it('should return a list of thoughts when an id is not given', function () {
            var res = buildResStub(),
                formatArgs,
                jsonArgs;

            shouldFindMatch = true;
            thoughtRoute.getAll({}, res);

            sinon.assert.calledOnce(Repository.prototype.findAll);
            Repository.prototype.findAll.calledBefore(res.format);

            sinon.assert.calledOnce(res.format);

            formatArgs = res.format.getCall(0).args[0];
            assert.isFunction(formatArgs.json);

            sinon.assert.calledOnce(res.json);
            jsonArgs = res.json.getCall(0).args[0];
            assert.strictEqual(findAllSuccessResult, jsonArgs);
        });

        beforeEach(before);
        afterEach(after);
    });
}());

