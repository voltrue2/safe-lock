'use strict';

const DEFAULT_TIMEOUT = 1000;

class ObjectLock {

    constructor(target, options) {
        this._target = target;
        this._locked = 0;
        this._queue = [];
        this._timeout = options && options.timeout ? options.timeout : DEFAULT_TIMEOUT;
        this._callback = null;
        this._onException = null;
    }

    aquire(func, cb) {
        if (this._isLocked()) {
            this._queue.push({func: func, callback: cb });
            return;
        }
        this._callback = cb;
        var bind = { that: this };
        try {
            // lock
            this._locked = Date.now();
            func(this._target, this._onFinished.bind(null, bind));
        } catch (err) {
            this._onFinished(bind, err);
        }
    }

    onException(cb) {
        this._onException = cb;
    }


    _onFinished(bind, error) {
        var that = bind.that;
        // release the lock
        that._locked = 0;
        that._dispatchCallback(error);
    }
    _dispatchCallback(error) {
        if (this._callback) {
            var cb = this._callback;
            this._callback = null;
            try {
                cb(error || null);
            } catch (err) {
                // well the callback failed...
                if (typeof this._onException === 'function') {
                    this._onException(err);
                } else {
                    /* eslint no-console: "off" */
                    console.error(err);
                }
            }
        }
        var queued = this._queue.shift();
        if (queued) {
            this.aquire(queued.func, queued.callback);
        }
    }

    _isLocked() {
        if (this._locked && Date.now() - this._locked < this._timeout) {
            return true;
        }
        // this includes expired lock as well
        return false;
    }

}

module.exports = ObjectLock;

