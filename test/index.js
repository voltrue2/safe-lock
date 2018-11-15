'use strict';

const assert = require('assert');
const ObjectLock = require('../index').ObjectLock;
const original = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g' ];
var list = [];

describe('safe-lock unit tests', () => {

    it('Cannot execute async add & rm in orderly manner w/o lock', (done) => {
        init();
        var counter = 0;
        var max = 4;
        rm(list, 'a', 10, next);
        add(list, 'a', 12, next);
        rm(list, 'b', 15, next);
        add(list, 'b', 5, next);

        function next() {
            counter += 1;
            if (counter === max) {
                assert.equal(list.length, original.length);
                assert.equal(list[0], 'c');
                assert.equal(list[6], 'a');
                assert.equal(list[5], 'b');
                done();
            }
        }

    });

    it('Can execute async add & rm in orderly manner w/ lock', (done) => {
        init();
        var counter = 0;
        var max = 4;
        var lock = new ObjectLock(list);
        lock.aquire((target, finish) => {
            rm(list, 'a', 10, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'a', 12, finish);
        }, next);
        lock.aquire((target, finish) => {
            rm(target, 'b', 15, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'b', 5, finish);
        }, next);

        function next() {
            counter += 1;
            if (counter === max) {
                assert.equal(list.length, original.length);
                assert.equal(list[0], 'c');
                assert.equal(list[5], 'a');
                assert.equal(list[6], 'b');
                done();
            }
        }

    });

    it('Can execute async add & rm in orderly manner w/ lock even w/ an exception', (done) => {
        init();
        var counter = 0;
        var max = 4;
        var lock = new ObjectLock(list);
        lock.aquire((target, finish) => {
            rm(list, 'a', 10, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'a', 12, finish);
        }, next);
        lock.aquire((target, finish) => {
            throw new Error('Oops');
            rm(target, 'b', 15, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'b', 5, finish);
        }, next);

        function next(err) {
            counter += 1;
            if (counter === 3) {
                assert(err);
                assert.equal(err.message, 'Oops');
            }
            if (counter === max) {
                assert.equal(list.length - 1, original.length);
                assert.equal(list[0], 'b');
                assert.equal(list[1], 'c');
                assert.equal(list[6], 'a');
                assert.equal(list[7], 'b');
                done();
            }
        }

    });

    it('Can execute async add & rm in orderly manner w/ lock even w/ an exception (retry)', (done) => {
        init();
        var counter = 0;
        var max = 4;
        var lock = new ObjectLock(list);
        lock.aquire((target, finish) => {
            rm(list, 'a', 10, finish);
        }, next);
        lock.aquire((target, finish) => {
            throw new Error('Wow...');
            add(target, 'a', 12, finish);
        }, (error) => {
            assert.equal(error.message, 'Wow...');
            // operation aborted b/c of the exception, so try again
            lock.aquire((target, finish) => {
                add(target, 'a', 12, finish);
            }, next);
        });
        lock.aquire((target, finish) => {
            rm(target, 'b', 15, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'b', 5, finish);
        }, next);

        function next() {
            counter += 1;
            if (counter === max) {
                assert.equal(list.length, original.length);
                assert.equal(list[0], 'c');
                assert.equal(list[5], 'a');
                assert.equal(list[6], 'b');
                done();
            }
        }

    });

    it('Execute async add & rm w/ lock and don\'t hang even when some operations time out (timed out operations are out of sync)', (done) => {
        init();
        var counter = 0;
        var max = 5;
        var lock = new ObjectLock(list, { timeout: 20 });
        lock.aquire((target, finish) => {
            rm(list, 'a', 10, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'a', 60, finish);
        }, (error) => {
            assert.equal(error.message, 'ObjectLockTimeout');
            console.log('add a 60 timed out');
            next();
        });
        lock.aquire((target, finish) => {
            rm(target, 'b', 70, finish);
        }, (error) => {
            assert.equal(error.message, 'ObjectLockTimeout');
            console.log('rm  b 70 timed out');
            next();
        });
        lock.aquire((target, finish) => {
            add(target, 'b', 5, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'z', 1, finish);
        }, () => {
            // wait until the timed out operations (two of them) are finished
            setTimeout(next, 60 + 70);
        });

        function next() {
            counter += 1;
            if (counter === max) {
                assert.equal(list.length - 1, original.length);
                assert.equal(list[0], 'c');
                assert.equal(list[5], 'b');
                assert.equal(list[6], 'z');
                assert.equal(list[7], 'a');
                done();
            }
        }

    });

    it('Cannot execute async add & rm in orderly manner w/o ObjectLock when there are race conditions', (done) => {
        init();
        var counter = 0;
        var max = 14;
        add(list, 'a', 8, next);
        add(list, 'b', 7, next);
        add(list, 'c', 6, next);
        add(list, 'd', 5, next);

        rm(list, 'a', 10, next);
        rm(list, 'b', 10, next);

        rm(list, 'c', 3, next);
        rm(list, 'd', 3, next);
        rm(list, 'g', 3, next);

        rm(list, 'f', 10, next);
        rm(list, 'e', 10, next);

        add(list, 'e', 4, next);
        add(list, 'f', 3, next);
        add(list, 'g', 2, next);

        function next() {
            counter += 1;
            if (counter === max) {
                assert.equal(list.length, original.length);
                assert.notEqual(JSON.stringify(list), JSON.stringify(original));
                done();
            }
        }

    });

    it('Can execute async add & rm in orderly manner w/ lock even when there are race conditions', (done) => {
        init();
        var counter = 0;
        var max = 14;
        var lock = new ObjectLock(list);
        lock.aquire((target, finish) => {
            add(target, 'a', 8, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'b', 7, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'c', 6, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'd', 5, finish);
        }, next);

        lock.aquire((target, finish) => {
            rm(target, 'a', 10, finish);
        }, next);
        lock.aquire((target, finish) => {
            rm(target, 'b', 10, finish);
        }, next);

        lock.aquire((target, finish) => {
            rm(target, 'c', 3, finish);
        }, next);
        lock.aquire((target, finish) => {
            rm(target, 'd', 3, finish);
        }, next);
        lock.aquire((target, finish) => {
            rm(target, 'g', 3, finish);
        }, next);

        lock.aquire((target, finish) => {
            rm(target, 'f', 10, finish);
        }, next);
        lock.aquire((target, finish) => {
            rm(target, 'e', 10, finish);
        }, next);

        lock.aquire((target, finish) => {
            add(target, 'e', 4, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'f', 3, finish);
        }, next);
        lock.aquire((target, finish) => {
            add(target, 'g', 2, finish);
        }, next);

        function next() {
            counter += 1;
            if (counter === max) {
                assert.equal(list.length, original.length);
                assert.equal(JSON.stringify(list), JSON.stringify(original));
                done();
            }
        }

    });

});

function add(target, item, time, cb) {
    setTimeout(() => {
        target.push(item);
        console.log('add', item, pad(time), target);
        cb();
    }, time);
}

function rm(target, item, time, cb) {
    setTimeout(() => {
        target.splice(target.indexOf(item), 1);
        console.log('rm ', item, pad(time), target);
        cb();
    }, time);
}

function init() {
    list = [];
    for (var i = 0, len = original.length; i < len; i++) {
        list.push(original[i]);
    }
}

function pad(n) {
    if (n < 10) {
        return '0' + n;
    }
    return n;
}

