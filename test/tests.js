import * as I from 'infestines'
import * as L from 'partial.lenses'
import * as R from 'ramda'

import * as F from '../dist/freer.cjs'

//

function show(x) {
  switch (typeof x) {
    case 'string':
    case 'object':
      return JSON.stringify(x)
    default:
      return `${x}`
  }
}

const toExpr = f =>
  f
    .toString()
    .replace(/\s+/g, ' ')
    .replace(/^\s*function\s*\(\s*\)\s*{\s*(return\s*)?/, '')
    .replace(/\s*;?\s*}\s*$/, '')
    .replace(/function\s*(\([a-zA-Z]*\))\s*/g, '$1 => ')
    .replace(/{\s*return\s*([^{;]+)\s*;\s*}/g, '$1')

function testEq(expect, thunk) {
  it(`${toExpr(thunk)} => ${show(expect)}`, async () => {
    const actual = await thunk()
    if (!R.equals(actual, expect))
      throw Error(`Expected: ${show(expect)}, actual: ${show(actual)}`)
  })
}

const testThrows = thunk =>
  it(`${toExpr(thunk)} => throws`, async () => {
    let raised
    let result
    try {
      result = await thunk()
      raised = false
    } catch (e) {
      result = e
      raised = true
    }
    if (!raised)
      throw Error(
        `Expected ${toExpr(thunk)} to throw, returned ${show(result)}`
      )
  })

//

const Reader1 = F.Reader()
const Reader2 = F.Reader()

//

const Writer = () => {
  function Tell(value) {
    this.value = value
  }
  const tell = value => new Tell(value)
  const run = F.handler(
    x => F.of([x, []]),
    (e, k) =>
      e instanceof Tell
        ? F.chain(([x, l]) => F.of([x, R.prepend(e.value, l)]), k(undefined))
        : F.chain(k, e)
  )
  return {tell, run}
}

const Writer1 = Writer()

//

const State1 = F.State()

//

const later = R.curry((ms, v) => new Promise(r => setTimeout(() => r(v), ms)))

//

describe('freer', () => {
  testThrows(() => F.run(F.chain(F.of, Reader1.ask)))

  testEq(3, () => I.seq(F.of(1), F.chain(x => F.of(x + 2)), F.run))

  testEq([3, 2], () =>
    I.seq(
      F.ap(F.map(R.pair, Reader1.local(x => x + 1, Reader1.ask)), Reader1.ask),
      Reader1.run(2),
      F.run
    )
  )

  testEq(['a', 'b'], () =>
    I.seq(
      F.ap(F.map(R.pair, Reader1.ask), Reader2.ask),
      Reader1.run('a'),
      Reader2.run('b'),
      F.run
    )
  )

  testEq(['a', 'b'], () =>
    I.seq(
      F.ap(F.map(R.pair, Reader1.ask), Reader2.ask),
      Reader2.run('b'),
      Reader1.run('a'),
      F.run
    )
  )

  testEq([55, 5], () =>
    I.seq(
      I.seq(
        F.ap(F.map(R.pair, State1.get), Reader1.ask),
        F.chain(sr => State1.put(R.sum(sr))),
        F.chain(() => F.ap(F.map(R.pair, State1.get), Reader1.ask))
      ),
      Reader1.run(5),
      State1.run(50),
      F.run
    )
  )

  testEq({x: 2, y: 1, z: 4}, () =>
    I.seq(
      L.traverse(F.Free, R.o(State1.modify, R.add), L.values, {
        x: 2,
        y: -1,
        z: 3
      }),
      State1.run(0),
      F.run
    )
  )

  testEq([10, ['begin', 'end']], () =>
    I.seq(
      Writer1.tell('begin'),
      F.chain(() => Reader1.ask),
      F.chain(r => I.seq(Writer1.tell('end'), F.chain(() => F.of(r)))),
      Reader1.run(10),
      Writer1.run,
      F.run
    )
  )

  testEq([[[[1]], [[[3]], [7]]], [[[10]]]], () =>
    I.seq(
      L.traverse(
        F.Free,
        x => I.seq(State1.modify(R.add(x)), F.chain(y => later(y, y))),
        L.flatten,
        [[[[1]], [[[2]], [4]]], [[[3]]]]
      ),
      State1.run(0),
      F.runAsync
    )
  )

  testEq([10, ['begin', 'end']], () =>
    I.seq(
      F.from(async $ => {
        await $(Writer1.tell('begin'))
        const r = await $(Reader1.ask)
        await $(Writer1.tell('end'))
        return r
      }),
      F.toAsync,
      Reader1.run(10),
      Writer1.run,
      F.runAsync
    )
  )

  testEq([[[[1]], [[[3]], [7]]], [[[10]]]], () =>
    I.seq(
      L.traverse(
        F.Free,
        x =>
          F.from(async $ => {
            const y = await $(State1.modify(R.add(x)))
            await later(y, y)
            return y
          }),
        L.flatten,
        [[[[1]], [[[2]], [4]]], [[[3]]]]
      ),
      F.toAsync,
      State1.run(0),
      F.runAsync
    )
  )
})
