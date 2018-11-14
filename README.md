# safe-lock

node.js object lock for asynchronous oeprations.
It enforces the order of operations to make sure your target object is never out of sync.

# How To Use

```javascript
const ObjectLock = require('safe-lock').ObjectLock;
const targetArray = [ 'a', 'b', 'c' ];
const lock = new ObjectLock(targetArray);
lock.aquire((target, finish) => {
    // async operation and mutate the target (targetArray)
    target[1] = 'B';
    target[2] = 'd';
    target[target.length - 1] = 'c';
    // make sure you call this to release the lock
    finish();
}, (error) => {
    // if you pass an error to finish(), you will see the error here
    // the lock operation has finished
});
lock.aquire((target, finish) => {
    // async operation and mutate the target (targetArray)
    target.splice(2, 1);
    // make sure you call this to release the lock
    finish();
}, (error) => {
    // if you pass an error to finish(), you will see the error here
    // the lock operation has finished
});

/**
* The above operation guarantees the order of operations from top to bottom
* so the outcome state of targetArray is always: [ 'a', 'B', 'c' ]
*/
```

