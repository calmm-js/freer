import * as I from './ext/infestines'

import * as F from './core'

const IVar = () => {
  let fill
  const p = new Promise(resolve => (fill = resolve))
  p.fill = fill
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
    effectV.fill(e)
    return resultV
  }

  fn(wait).then(r => {
    resultV = null
    effectV.fill(r)
  })

  const onEffect = v_or_e => {
    if (resultV) {
      effectV = IVar()
      return F.chain(onResult, v_or_e)
    } else {
      return F.of(v_or_e)
    }
  }

  const onResult = v => {
    resultV.fill(v)
    return F.chain(onEffect, effectV)
  }

  return F.chain(onEffect, effectV)
}

export const from = fn => new From(fn)

export const toAsync = F.handler(
  I.resolve,
  (e, k) => (e instanceof From ? F.chain(k, unravel(e[FN])) : F.chain(k, e))
)
