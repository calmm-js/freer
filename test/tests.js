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
    .replace(/^\(\) => /, '')
    .replace(/\s+/g, ' ')
    .replace(/;\s*}/g, ' }')

function testEq(expect, thunk) {
  it(`${toExpr(thunk)} ~> ${show(expect)}`, async () => {
    const actual = await thunk()
    if (!R.equals(actual, expect))
      throw Error(`Expected: ${show(expect)}, actual: ${show(actual)}`)
  })
}

const testThrows = thunk =>
  it(`${toExpr(thunk)} ~> throws`, async () => {
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
  const Tell = I.inherit(function Tell(value) {
    this.value = value
  }, F.Effect)
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

const Exn1 = F.Exception()
const Exn2 = F.Exception({empty: R.always([]), concat: R.concat})

//

describe('freer', () => {
  const add = F.lift(R.add)
  const pair = F.lift(R.pair)
  const sum = F.lift(R.sum)
  const negate = F.lift(R.negate)

  testThrows(() => F.run(F.chain(F.of, Reader1.ask)))

  testEq(3, () => F.run(F.thru(F.of(1), x => F.of(x + 2))))

  testEq(101, () => F.run(F.join(F.of(F.of(101)))))

  testEq(76, () => F.run(F.pipe()(76)))
  testEq(76, () => F.run(F.compose()(76)))

  testEq(76, () =>
    I.seq(
      F.compose(
        () => State1.get,
        State1.put
      )(76),
      State1.run(0),
      F.run
    )
  )

  testEq(42, () => F.run(F.when(true, F.of(42))))
  testEq(42, () => F.run(F.unless(false, F.of(42))))

  testEq([3, 2], () =>
    I.seq(
      pair(Reader1.local(x => x + 1, Reader1.ask), Reader1.ask),
      Reader1.run(2),
      F.run
    )
  )

  testEq(['a', 'b'], () =>
    I.seq(
      pair(Reader1.ask, Reader2.ask),
      Reader1.run('a'),
      Reader2.run('b'),
      F.run
    )
  )

  testEq(['a', 'b'], () =>
    I.seq(
      F.sequence([Reader1.ask, Reader2.ask]),
      Reader2.run('b'),
      Reader1.run('a'),
      F.run
    )
  )

  testEq([55, 5], () =>
    I.seq(
      F.thru(sum(pair(State1.get, Reader1.ask)), State1.put, () =>
        pair(State1.get, Reader1.ask)
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
      F.thru(
        Writer1.tell('begin'),
        () => Reader1.ask,
        r => F.thru(Writer1.tell('end'), () => F.of(r))
      ),
      Reader1.run(10),
      Writer1.run,
      F.run
    )
  )

  testEq([[[[1]], [[[3]], [7]]], [[[10]]]], () =>
    I.seq(
      L.traverse(
        F.Free,
        F.pipe(
          R.o(State1.modify, R.add),
          y => later(y, y)
        ),
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

  testEq(Exn1.raise('Error'), () =>
    I.seq(
      negate(add(Reader1.ask, Exn1.raise('Error'))),
      Reader1.run(2),
      Exn1.run,
      F.run
    )
  )

  testEq('error?', () =>
    I.seq(
      F.map(
        R.concat(R.__, '?'),
        Exn1.handle(
          e => F.of(R.toLower(e)),
          add(Reader1.ask, Exn1.raise('Error'))
        )
      ),
      Reader1.run(2),
      Exn1.run,
      F.run
    )
  )

  testEq(Exn2.raise(['E1', 'E2', 'E3']), () =>
    I.seq(
      Exn2.alts(Exn2.raise(['E1']), Exn2.raise(['E2']), Exn2.raise(['E3'])),
      Exn2.run,
      F.run
    )
  )

  testEq(101, () =>
    I.seq(
      Exn1.alts(Exn1.raise('E1'), F.of(101), Exn1.raise('E2')),
      Exn1.run,
      F.run
    )
  )
})
