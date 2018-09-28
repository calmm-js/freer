import * as I from './ext/infestines'

import * as F from './core'

export const runAsync = F.handler(
  I.resolve,
  (e, k) => (I.isThenable(e) ? e.then(k) : F.chainU(k, e))
)
