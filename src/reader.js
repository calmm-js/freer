import * as I from './ext/infestines'

import * as F from './core'

export const Reader = () => {
  const ask = new function Ask() {}()
  const run = I.curryN(2, v =>
    F.handler(F.of, (e, k) => (e === ask ? k(v) : F.chainU(k, e)))
  )
  const local = I.curry((vv, m) => F.chainU(v => run(vv(v), m), ask))
  return {ask, local, run}
}
