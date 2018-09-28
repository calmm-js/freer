import * as I from './ext/infestines'

import * as F from './core'

const VALUE = 'v'

const IVar = () => {
  let value
  const p = new Promise(resolve => (value = resolve))
  p[VALUE] = value
  return p
}

const FN = 'f'

function From(fn) {
  this[FN] = fn
}

const unravel = fn => {
  let effectV = IVar()
  let resultV

  const wait = e => {
    resultV = IVar()
    effectV[VALUE](e)
    return resultV
  }

  fn(wait).then(r => {
    resultV = null
    effectV[VALUE](r)
  })

  const onEffect = v_or_e => {
    if (resultV) {
      effectV = IVar()
      return F.chainU(onResult, v_or_e)
    } else {
      return F.of(v_or_e)
    }
  }

  const onResult = v => {
    resultV[VALUE](v)
    return F.chainU(onEffect, effectV)
  }

  return F.chainU(onEffect, effectV)
}

export const from = fn => new From(fn)

export const toAsync = F.handler(
  I.resolve,
  (e, k) => (e instanceof From ? F.chainU(k, unravel(e[FN])) : F.chainU(k, e))
)
