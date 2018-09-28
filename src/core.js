import * as I from './ext/infestines'

// Computation queue

const PREFIX = 'p'
const SUFFIX = 's'

const names = c =>
  I.isFunction(c)
    ? [c.name || `${c}`]
    : names(c[PREFIX]).concat(names(c[SUFFIX]))

function Concat(prefix, suffix) {
  this[PREFIX] = prefix
  this[SUFFIX] = suffix
}

// Term representation

const VALUE = 'v'

function Pure(value) {
  this[VALUE] = value
}

const isPure = x => x instanceof Pure

//

const EFFECT = 'e'
const COMPUTATION = 'c'

const Impure = (process.env.NODE_ENV === 'production'
  ? I.id
  : Impure =>
      I.inherit(Impure, Object, {
        toString() {
          return `Impure(${this[EFFECT]}, [${names(this[COMPUTATION]).join(
            ', '
          )}])`
        }
      }))(function Impure(effect, computation) {
  this[EFFECT] = effect
  this[COMPUTATION] = computation
})

const impure = (effect, computation) => new Impure(effect, computation)

const isImpure = term => term instanceof Impure

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

const chainU = function chain(xy, x) {
  return isPure(x) ? xy(x[VALUE]) : append(x, xy)
}

const mapU = function map(xy, x) {
  return isPure(x) ? of(xy(x[VALUE])) : append(x, x => of(xy(x)))
}

const apU = function ap(xy, x) {
  return isPure(xy) ? mapU(xy[VALUE], x) : append(xy, xy => mapU(xy, x))
}

// Public interface

export const of = value => new Pure(value)
export const chain = I.curry(chainU)
export const map = I.curry(mapU)
export const ap = I.curry(apU)

export const Free = {map: mapU, of, ap: apU, chain: chainU}

export const run = term =>
  isPure(term) ? term[VALUE] : throwExpectedPure(term)

export const handler = I.curry(
  (onPure, onEffect) =>
    function loop(term, state) {
      if (isPure(term)) {
        return onPure(term[VALUE], state)
      } else {
        let computation
        let effect
        if (isImpure(term)) {
          computation = term[COMPUTATION]
          effect = term[EFFECT]
        } else {
          computation = of
          effect = term
        }
        const continuation = (value, state) =>
          loop(applyTo(computation, value), state)
        return onEffect(effect, continuation, state)
      }
    }
)
