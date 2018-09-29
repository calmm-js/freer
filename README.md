# <a id="freer"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#) [Freer](#freer) &middot; [![Gitter](https://img.shields.io/gitter/room/calmm-js/chat.js.svg)](https://gitter.im/calmm-js/chat) [![GitHub stars](https://img.shields.io/github/stars/calmm-js/freer.svg?style=social)](https://github.com/calmm-js/freer) [![npm](https://img.shields.io/npm/dm/freer.svg)](https://www.npmjs.com/package/freer)

This is an *experimental* JavaScript library that implements a Free (or Freer)
monad with composable effect handlers.

**WARNING:** This library is not yet ready for production use.

[![npm version](https://badge.fury.io/js/freer.svg)](http://badge.fury.io/js/freer)
[![Build Status](https://travis-ci.org/calmm-js/freer.svg?branch=master)](https://travis-ci.org/calmm-js/freer)
[![Code Coverage](https://img.shields.io/codecov/c/github/calmm-js/freer/master.svg)](https://codecov.io/github/calmm-js/freer?branch=master)
[![](https://david-dm.org/calmm-js/freer.svg)](https://david-dm.org/calmm-js/freer)
[![](https://david-dm.org/calmm-js/freer/dev-status.svg)](https://david-dm.org/calmm-js/freer?type=dev)

## <a id="contents"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#contents) [Contents](#contents)

* [Examples](#examples)
  * [Getting started](#getting-started)
  * [Running sum of leaves](#running-sum-of-leaves)
* [Reference](#reference)
  * [Free monad](#free-monad)
    * [`F.Free ~> monad`](#F-Free)
  * [Free combinators](#free-combinators)
    * [`F.map(value => value, free) ~> free`](#F-map)
    * [`F.of(value) ~> free`](#F-of)
    * [`F.ap(free, free) ~> free`](#F-ap)
    * [`F.chain(value => free, free) ~> free`](#F-chain)
  * [Identity handler](#identity-handler)
    * [`F.run(free) ~> value`](#F-run)
    * [`F.runAsync(free) ~> promise`](#F-runAsync)
  * [Do notation](#do-notation)
    * [`F.from(async $ => { ... await $(free) ... }) ~> free`](#F-from)
    * [`F.toAsync(free) ~> free`](#F-toAsync)
  * [Defining new handlers](#defining-new-handlers)
    * [`F.handler((value, any) => free, (effect, continuation, any) => free) ~> (free, any) ~> free`](#F-handler)
  * [Handlers à la carte](#handlers-a-la-carte)
    * [`F.Exception([{concat[, empty]}]) ~> {raise, handle[, zero], alt, alts, run}`](#F-Exception)
    * [`F.Reader() ~> {ask, local, run}`](#F-Reader)
    * [`F.State() ~> {get, put, modify, run}`](#F-State)
* [Related work](#related-work)

## <a id="examples"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#examples) [Examples](#examples)

### <a id="getting-started"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#getting-started) [Getting started](#getting-started)

First we create some handlers and free operations:

```js
var aReader = F.Reader()
var aState = F.State()
```

Then we define an ad-hoc operation that uses the previously defined free
operations:

```js
var addReaderToState = F.from(async $ => {
  const v = await $(aReader.ask)
  return $(aState.modify(R.add(v)))
})
```

The above uses a [`do` notation](#do-notation) approximation provided by this
library.  One could also define the above operation using just the basic
[monadic combinators](#free-combinators).

Then we compose a runner that handles the operations we used:

```js
var aRunner = R.compose(F.runAsync, aState.run(1), aReader.run(2), F.toAsync)
```

Finally we run the operation and log the result:

```js
aRunner(addReaderToState).then(console.log)
// Promise 3
```

### <a id="running-sum-of-leaves"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#running-sum-of-leaves) [Running sum of leaves](#running-sum-of-leaves)

Here is an example using
[`traverse`](https://github.com/calmm-js/partial.lenses/#L-traverse) from
Partial Lenses to compute a running sum of the leaves of a nested data
structure:

```js
R.compose(F.run, aState.run(0))(
  L.traverse(
    F.Free,
    x => aState.modify(R.add(x)),
    L.leafs,
    [{x: 3, y: [1]}, {z: [4, 1]}]
  )
)
// [{x: 3, y: [4]}, {z: [8, 9]}]
```

## <a id="reference"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#reference) [Reference](#reference)

The [combinators](https://wiki.haskell.org/Combinator) provided by this library
are provided as named exports.  Typically one just imports this library as:

```jsx
import * as F from 'freer'
```

The examples also make use of the [Partial
Lenses](https://github.com/calmm-js/partial.lenses/) and
[Ramda](https://github.com/calmm-js/partial.lenses/) libraries imported as:

```jsx
import * as L from 'partial.lenses'
import * as R from 'ramda'
```

Neither of those libraries is required in order to use this library.

### <a id="free-monad"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#free-monad) [Free monad](#free-monad)

#### <a id="F-Free"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-Free) [`F.Free ~> monad`](#F-Free)

`F.Free` is the [Static
Land](https://github.com/rpominov/static-land/blob/master/docs/spec.md)
compatible
[`Monad`](https://github.com/rpominov/static-land/blob/master/docs/spec.md#monad)
definition for the
[monad](https://github.com/rpominov/static-land/blob/master/docs/spec.md#monad)
provided by this library.

### <a id="free-combinators"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#free-combinators) [Free combinators](#free-combinators)

#### <a id="F-map"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-map) [`F.map(value => value, free) ~> free`](#F-map)

`F.map` is the [Static
Land](https://github.com/rpominov/static-land/blob/master/docs/spec.md)
compatible
[`map`](https://github.com/rpominov/static-land/blob/master/docs/spec.md#functor)
combinator of the
[monad](https://github.com/rpominov/static-land/blob/master/docs/spec.md#monad)
provided by this library.

#### <a id="F-of"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-of) [`F.of(value) ~> free`](#F-of)

`F.of` is the [Static
Land](https://github.com/rpominov/static-land/blob/master/docs/spec.md)
compatible
[`of`](https://github.com/rpominov/static-land/blob/master/docs/spec.md#applicative)
combinator of the
[monad](https://github.com/rpominov/static-land/blob/master/docs/spec.md#monad)
provided by this library.

#### <a id="F-ap"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-ap) [`F.ap(free, free) ~> free`](#F-ap)

`F.ap` is the [Static
Land](https://github.com/rpominov/static-land/blob/master/docs/spec.md)
compatible
[`ap`](https://github.com/rpominov/static-land/blob/master/docs/spec.md#apply)
combinator of the
[monad](https://github.com/rpominov/static-land/blob/master/docs/spec.md#monad)
provided by this library.

#### <a id="F-chain"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-chain) [`F.chain(value => free, free) ~> free`](#F-chain)

`F.chain` is the [Static
Land](https://github.com/rpominov/static-land/blob/master/docs/spec.md)
compatible
[`chain`](https://github.com/rpominov/static-land/blob/master/docs/spec.md#chain)
combinator of the monad provided by this library.

### <a id="identity-handler"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#identity-handler) [Identity handler](#identity-handler)

#### <a id="F-run"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-run) [`F.run(free) ~> value`](#F-run)

`F.run` is the identity handler for the free monad.  It doesn't handle any
effects per se, it just extracts the result of the computation.

#### <a id="F-runAsync"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-runAsync) [`F.runAsync(free) ~> promise`](#F-runAsync)

`F.runAsync` is the asynchronous identity handler for the free monad.  It only
handles promises.

### <a id="do-notation"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#do-notation) [Do notation](#do-notation)

#### <a id="F-from"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-from) [`F.from(async $ => { ... await $(free) ... }) ~> free`](#F-from)

`F.from` is used to wrap an `async $ => { ... }` function that `await $( ... )`s
for effects, reminescent of a [`do`
notation](https://en.wikibooks.org/wiki/Haskell/do_notation), as a free
operation to be handled by [`F.toAsync`](#F-toAsync).

#### <a id="F-toAsync"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-toAsync) [`F.toAsync(free) ~> free`](#F-toAsync)

`F.toAsync` is the handler for the operations produced by [`F.from`](#F-from)
and converts those effects to promises.  This handler must be before handlers
for effects used in the operations produced by [`F.from`](#F-from) and the
promises need to be handled by [`F.runAsync`](#F-runAsync).  In other words, the
handler composition should look like `R.compose(F.runAsync, ..., F.toAsync)`.

### <a id="defining-new-handlers"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#defining-new-handlers) [Defining new handlers](#defining-new-handlers)

#### <a id="F-handler"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-handler) [`F.handler((value, any) => free, (effect, continuation, any) => free) ~> (free[, any]) ~> free`](#F-handler)

`F.handler` defines a handler for some effects.  The first argument is the
handler for the final result.  The second argument is the handler for some
effects.  It is given an effect, which the handler may or many not know how to
handle, and the continuation and it must then return a free operation.

### <a id="handlers-a-la-carte"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#handlers-a-la-carte) [Handlers à la carte](#handlers-a-la-carte)

#### <a id="F-Exception"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-Exception) [`F.Exception([{concat[, empty]}]) ~> {raise, handle[, zero], alt, alts, run}`](#F-Exception)

`F.Exception` is a factory for Exception handling effects.  The optional
argument is a
[semigroup](https://github.com/rpominov/static-land/blob/master/docs/spec.md#semigroup)
or
[monoid](https://github.com/rpominov/static-land/blob/master/docs/spec.md#monoid)
used for combining exception values in `alt` and `alts`.  In case the argument
is just a semigroup, `alts` requires at least one operation and there will be no
`zero`.  The default argument is a semigroup that uses the last exception value.

Given `const Ex = F.Exception()`,

* `Ex.raise(any) ~> free` raises the given value to the closest enclosing
  `Ex.handle`r or to the top of the handler stack,
* `Ex.handle(any => free, free) ~> free` handles values raised from the given
  operation,
* `Ex.zero ~> free` is equivalent to `Ex.raise(empty())` when the argument to
  `F.Exception` is a monoid,
* `Ex.alts(...free) ~> free` tries the given operations in turn and returns the
  result of the first operation that completes without raising or raises the
  values accumulated from all the operations that raised,
* `Ex.alt(free, free) ~> free` is a curried binary version of `Ex.alts`, and
* `Ex.run` is the handler for the operations.

For example:

```js
const Ex = F.Exception()

R.compose(F.run, Ex.run)(
  Ex.alt(
    Ex.raise(`You'll never see me!`),
    Ex.handle(
      e => Ex.raise(`Nor me!`),
      F.of(`This is what you'll get!`)
    )
  )
)
// 'This is what you'll get!'
```

#### <a id="F-Reader"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-Reader) [`F.Reader() ~> {ask, local, run}`](#F-Reader)

`F.Reader` is a factory for Reader effects.

Given `const Rd = F.Reader()`,

* `Rd.ask ~> free` is an operation whose result is the value from the reader,
* `Rd.local(value => value, free) ~> free` returns an operation that runs the
  given operation with the value of the reader modified with the given function,
  and
* `Rd.run(value, free)` is the handler for the operations.

For example:

```js
const Rd = F.Reader()

R.compose(F.run, Rd.run(1))(
  F.ap(Rd.local(R.inc, F.map(R.add, Rd.ask)), Rd.ask)
)
// 3
```

#### <a id="F-State"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#F-State) [`F.State() ~> {get, put, modify, run}`](#F-State)

`F.State` is a factory for State effects.

Given `const St = F.State()`,

* `St.get ~> free` is an operation whose result is the current state,
* `St.put(value) ~> free` is an operation that replaces the state with the given
  value,
* `St.modify(value => value) ~> free` is operation that updates the state with
  the given function and whose result is the new state, and
* `St.run` is the handler for the operations.

For example:

```js
const St = F.State()

R.compose(F.run, St.run(undefined))(
  L.traverse(
    F.Free,
    it => F.chain(
      prev => (it === prev ? F.of(undefined) : St.modify(R.always(it))),
      St.get
    ),
    L.elems,
    [1, 2, 2, 1, 1, 3]
  )
)
// [1, 2, 1, 3]
```

## <a id="related-work"></a> [≡](#contents) [▶](https://calmm-js.github.io/freer/index.html#reference) [Related work](#related-work)

The core of this library is based on ideas from [Extensible Effects: an
alternative to Monad Transformers](http://okmij.org/ftp/Haskell/extensible/).
