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
    setTimeout(() => {
        target.splice(target.length - 1, 1);
        target.splice(target.length - 1, 1);
        // make sure you call this to release the lock
        finish();
    }, 20);
}, (error) => {
    // if you pass an error to finish(), you will see the error here
    // the lock operation has finished
});
lock.aquire((target, finish) => {
    // async operation and mutate the target (targetArray)
    setTimeout(() => {
        target.push('B');
        target.push('C');
        // make sure you call this to release the lock
        finish();
    }, 5);
}, (error) => {
    // if you pass an error to finish(), you will see the error here
    // the lock operation has finished
});
/**
* The above operations guarantee the order of operations from top to bottom
* so the outcome state of targetArray is always: [ 'a', 'B', 'C' ]
*/
```

# Lock Time Out

By default, each lock has a time out of 1 second (1000 milliseconds), if one or more locked operations time out,
The timed out operations are **NOT** guranteed to run in sync.

The callback wil be called when an operaion times out with an error and moves on to the next lock operation.

# Set Custom Lock Time Out

In order to set custom time out, you must pass the configurations as shown below:

```javascript
// The example sets the lock time out to be 30 seconds
const lock = new ObjectLock(targetArray, { timeout: 30000 });
```

