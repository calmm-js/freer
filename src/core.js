import * as I from './ext/infestines'

// Debug

const showFn = x => x.name || x.toString()

const showParams = x => {
  const vs = I.values(x)
  return vs.length ? `(${vs.map(show).join(', ')})` : ''
}

const show = x =>
  I.isFunction(x)
    ? showFn(x)
    : I.isInstanceOf(Object, x) && I.constructorOf(x)
    ? `${showFn(I.constructorOf(x))}${showParams(x)}`
    : JSON.stringify(x)

// Computation queue

const PREFIX = 'p'
const SUFFIX = 's'

function Concat(prefix, suffix) {
  this[PREFIX] = prefix
  this[SUFFIX] = suffix
}

// Term representation

const Term = (process.env.NODE_ENV === 'production' ? fn => fn : I.inherit)(
  function Term() {},
  Object,
  {
    toString() {
      return show(this)
    }
  }
)

//

const VALUE = 'v'

const Pure = I.inherit(function Pure(value) {
  this[VALUE] = value
}, Term)

const isPure = I.isInstanceOf(Pure)

//

const EFFECT = 'e'
const COMPUTATION = 'c'

const Impure = I.inherit(function Impure(effect, computation) {
  this[EFFECT] = effect
  this[COMPUTATION] = computation
}, Term)

const impure = (effect, computation) => new Impure(effect, computation)

const isImpure = I.isInstanceOf(Impure)

const append = (term, tail) =>
  isImpure(term)
    ? impure(term[EFFECT], new Concat(term[COMPUTATION], tail))
    : impure(term, tail)

//

const throwExpectedPure = term => {
  throw Error(`Expected a pure value, but got: ${term}`)
}

// Interpreter

const applyTo = (computation, value) => {
  while (!I.isFunction(computation)) {
    let head = computation[PREFIX]
    computation = computation[SUFFIX]
    while (!I.isFunction(head)) {
      computation = new Concat(head[SUFFIX], computation)
      head = head[PREFIX]
    }
    const next = head(value)
    if (isPure(next)) {
      value = next[VALUE]
    } else {
      return append(next, computation)
    }
  }
  return computation(value)
}

// Monad combinators

export const chainU = function chain(xy, x) {
  return isPure(x) ? xy(x[VALUE]) : append(x, xy)
}

export const mapU = function map(xy, x) {
  return isPure(x) ? of(xy(x[VALUE])) : append(x, x => of(xy(x)))
}

export const apU = function ap(xy, x) {
  return isPure(xy) ? mapU(xy[VALUE], x) : append(xy, xy => mapU(xy, x))
}

// Public interface

export const of = I.construct1(Pure)
export const chain = I.curry(chainU)
export const map = I.curry(mapU)
export const ap = I.curry(apU)

export const Free = I.Monad(mapU, of, apU, chainU)

export const run = term =>
  isPure(term) ? term[VALUE] : throwExpectedPure(term)

export const Effect = I.inherit(function Effect() {}, Term)

export const handler = I.curry(function handler(onPure, onEffect) {
  return function handler(term, state) {
    if (isPure(term)) {
      return onPure(term[VALUE], state)
    } else if (isImpure(term)) {
      const computation = term[COMPUTATION]
      const continuation = (value, state) =>
        handler(applyTo(computation, value), state)
      return onEffect(term[EFFECT], continuation, state)
    } else {
      return onEffect(term, onPure, state)
    }
  }
})
