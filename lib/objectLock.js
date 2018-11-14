'use strict';

const DEFAULT_TIMEOUT = 1000;

class ObjectLock {

    constructor(target, options) {
        this._target = target;
        this._locked = 0;
        this._queue = [];
        this._timeout = options && options.timeout ? options.timeout : DEFAULT_TIMEOUT;
        this._timer = null;
        this._callback = null;
        this._onException = null;
    }

    aquire(func, cb) {
        if (this._locked) {
            this._queue.push({func: func, callback: cb });
            return;
        }
        this._callback = cb;
        try {
            // lock
            this._locked = Date.now();
            var bind = { that: this };
            this._timer = setTimeout(this._checkTimeout.bind(null, bind), this._timeout);
            func(this._target, this._onFinished.bind(null, bind));
        } catch (err) {
            this._dispatchCallback(err);
        }
    }

    onException(cb) {
        this._onException = cb;
    }

    _onFinished(bind, error) {
        var that = bind.that;
        // terminate timeout
        if (that._timer !== null) {
            clearTimeout(that._timer);
            that._timer = null;
        }
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

    _checkTimeout(bind) {
        var that = bind.that;
        if (that._locked && Date.now() - that._locked >= that._timeout) {
            // release the lock
            that._lock = 0;
            that._dispatchCallback(new Error('ObjectLockTimeOut'));
        }
    }

}

module.exports = ObjectLock;

