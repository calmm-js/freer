import * as I from 'infestines'

export * from 'infestines'

export const setNameU =
  process.env.NODE_ENV === 'production' ? fn => fn : I.defineNameU

export const copyNameU =
  process.env.NODE_ENV === 'production'
    ? fn => fn
    : (fn, from) => I.defineNameU(fn, from.name)

export const isInstanceOf = I.curry(I.isInstanceOfU)

export const construct1 = Type => copyNameU(x => new Type(x), Type)
