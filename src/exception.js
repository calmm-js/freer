import * as I from './ext/infestines'

import * as F from './core'

const last = {concat: I.sndU}

export function Exception() {
  const {empty, concat} = (arguments.length && arguments[0]) || last
  function Raise(value) {
    this.value = value
  }
  const isRaise = I.isInstanceOf(Raise)
  const raise = I.construct1(Raise)
  const run = F.handler(F.of, (e, k) => (isRaise(e) ? F.of(e) : F.chainU(k, e)))
  const handle = I.curryN(2, onRaise =>
    F.handler(F.of, (e, k) => (isRaise(e) ? onRaise(e.value) : F.chainU(k, e)))
  )
  const zero = empty ? raise(empty()) : undefined
  const altU = function alt(l, r) {
    return handle(el => handle(er => raise(concat(el, er)), r), l)
  }
  const alt = I.curry(altU)
  const semi = function alts(_) {
    let n = arguments.length
    let r = arguments[--n]
    while (n) {
      const l = arguments[--n]
      r = altU(l, r)
    }
    return r
  }
  const alts = zero
    ? function alts() {
        return arguments.length === 0 ? zero : semi.apply(null, arguments)
      }
    : semi
  return I.assocPartialU('zero', zero, {raise, handle, alt, alts, run})
}
