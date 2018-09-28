import * as I from 'infestines'

export * from 'infestines'

export const isThenable = x => null != x && I.isFunction(x.then)

export const isInstanceOf = I.curry(function isInstanceOf(Type, x) {
  return x instanceof Type
})

export const resolve = x => Promise.resolve(x)

export const construct1 = Type => x => new Type(x)
