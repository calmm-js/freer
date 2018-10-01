import * as I from './ext/infestines'
import * as F from './core'

export const join = m => F.chainU(I.id, m)

export const noop = F.of(undefined)

const alwaysNoop = I.always(noop)
const either = (onT, onF) => b => (b ? onT : onF)

export const when = I.curryN(2, I.setNameU(either(I.id, alwaysNoop), 'when'))
export const unless = I.curryN(
  2,
  I.setNameU(either(alwaysNoop, I.id), 'unless')
)

const pipe2U = function pipe2(l, r) {
  return function pipe2(x) {
    return F.chainU(r, l(x))
  }
}

export function pipe() {
  let n = arguments.length
  if (!n) return F.of
  let r = arguments[--n]
  while (n) r = pipe2U(arguments[--n], r)
  return r
}

export function compose() {
  let n = arguments.length
  if (!n) return F.of
  let r = arguments[--n]
  while (n) r = pipe2U(r, arguments[--n])
  return r
}

export function thru(m) {
  const n = arguments.length
  for (let i = 1; i < n; ++i) m = F.chainU(arguments[i], m)
  return m
}

const cons = l => r => [l, r]
const toArray = cs => {
  const r = []
  while (cs) {
    r.push(cs[0])
    cs = cs[1]
  }
  return r.reverse()
}

export const sequence = xs => {
  const n = xs.length
  let r = F.of(null)
  for (let i = 0; i < n; ++i) r = F.apU(F.mapU(cons, xs[i]), r)
  return F.mapU(toArray, r)
}

export const lift = fn => {
  const fnc = I.copyNameU(cs => fn.apply(null, toArray(cs)), fn)
  return I.arityN(
    fn.length,
    I.copyNameU(function() {
      const n = arguments.length
      let r = F.of(null)
      for (let i = 0; i < n; ++i) r = F.apU(F.mapU(cons, arguments[i]), r)
      return F.mapU(fnc, r)
    }, fn)
  )
}
