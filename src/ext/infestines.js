import * as I from 'infestines'

export * from 'infestines'

export const isInstanceOf = I.curry(I.isInstanceOfU)


export const construct1 = Type => x => new Type(x)
