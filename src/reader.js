import * as I from './ext/infestines'

import * as F from './core'

export const Reader = () => {
  const ask = new function Ask() {}()
  const run = I.curryN(2, function runReader(v) {
    return F.handler(F.of, (e, k) => (e === ask ? k(v) : F.chainU(k, e)))
  })
  const local = I.curry(function local(vv, m) {
    return F.chainU(v => run(vv(v), m), ask)
  })
  return {ask, local, run}
}
