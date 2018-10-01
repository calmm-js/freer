import * as I from './ext/infestines'

import * as F from './core'

const VALUE = 'v'

export const State = () => {
  const Get = I.inherit(function Get() {}, F.Effect)
  const get = new Get()
  const Put = I.inherit(function Put(value) {
    this[VALUE] = value
  }, F.Effect)
  const isPut = I.isInstanceOf(Put)
  const put = I.construct1(Put)
  const runner = F.handler(
    F.of,
    (e, k, s) =>
      e === get
        ? k(s, s)
        : isPut(e)
          ? k(undefined, e[VALUE])
          : F.chainU(function continueState(v) {
              return k(v, s)
            }, e)
  )
  const run = I.curry(function runState(s, m) {
    return runner(m, s)
  })
  const modify = ss =>
    F.chainU(s0 => {
      const s = ss(s0)
      return F.chainU(() => F.of(s), put(s))
    }, get)
  return {get, put, modify, run}
}
