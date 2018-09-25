import * as I from 'infestines'

export * from 'infestines'

export const isThenable = x => null != x && I.isFunction(x.then)

export const resolve = x => Promise.resolve(x)
