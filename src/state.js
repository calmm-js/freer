import * as I from './ext/infestines'

import * as F from './core'

const VALUE = 'v'

export const State = () => {
  const get = new function Get() {}()
  function Put(value) {
    this[VALUE] = value
  }
  const put = value => new Put(value)
  const runner = F.handler(
    F.of,
    (e, k, s) =>
      e === get
        ? k(s, s)
        : e instanceof Put
          ? k(undefined, e[VALUE])
          : F.chainU(v => k(v, s), e)
  )
  const run = I.curry((s, m) => runner(m, s))
  const modify = ss =>
    F.chainU(s0 => {
      const s = ss(s0)
      return F.chainU(() => F.of(s), put(s))
    }, get)
  return {get, put, modify, run}
}
