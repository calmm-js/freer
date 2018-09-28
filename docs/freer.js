(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('infestines')) :
  typeof define === 'function' && define.amd ? define(['exports', 'infestines'], factory) :
  (factory((global.freer = {}),global.I));
}(this, (function (exports,I) { 'use strict';

  var isThenable = function isThenable(x) {
    return null != x && I.isFunction(x.then);
  };

  var resolve = function resolve(x) {
    return Promise.resolve(x);
  };

  // Computation queue

  var PREFIX = 'p';
  var SUFFIX = 's';

  var names = function names(c) {
    return I.isFunction(c) ? [c.name || '' + c] : names(c[PREFIX]).concat(names(c[SUFFIX]));
  };

  function Concat(prefix, suffix) {
    this[PREFIX] = prefix;
    this[SUFFIX] = suffix;
  }

  // Term representation

  var VALUE = 'v';

  function Pure(value) {
    this[VALUE] = value;
  }

  var isPure = function isPure(x) {
    return x instanceof Pure;
  };

  //

  var EFFECT = 'e';
  var COMPUTATION = 'c';

  var Impure = /*#__PURE__*/(function (Impure) {
    return I.inherit(Impure, Object, {
      toString: function toString() {
        return 'Impure(' + this[EFFECT] + ', [' + names(this[COMPUTATION]).join(', ') + '])';
      }
    });
  })(function Impure(effect, computation) {
    this[EFFECT] = effect;
    this[COMPUTATION] = computation;
  });

  var impure = function impure(effect, computation) {
    return new Impure(effect, computation);
  };

  var isImpure = function isImpure(term) {
    return term instanceof Impure;
  };

  var append = function append(term, tail) {
    return isImpure(term) ? impure(term[EFFECT], new Concat(term[COMPUTATION], tail)) : impure(term, tail);
  };

  //

  var throwExpectedPure = function throwExpectedPure(term) {
    throw Error('Expected a pure value, but got: ' + term);
  };

  // Interpreter

  var applyTo = function applyTo(computation, value) {
    while (!I.isFunction(computation)) {
      var head = computation[PREFIX];
      computation = computation[SUFFIX];
      while (!I.isFunction(head)) {
        computation = new Concat(head[SUFFIX], computation);
        head = head[PREFIX];
      }
      var next = head(value);
      if (isPure(next)) {
        value = next[VALUE];
      } else {
        return append(next, computation);
      }
    }
    return computation(value);
  };

  // Monad combinators

  var chainU = function chain(xy, x) {
    return isPure(x) ? xy(x[VALUE]) : append(x, xy);
  };

  var mapU = function map(xy, x) {
    return isPure(x) ? of(xy(x[VALUE])) : append(x, function (x) {
      return of(xy(x));
    });
  };

  var apU = function ap(xy, x) {
    return isPure(xy) ? mapU(xy[VALUE], x) : append(xy, function (xy) {
      return mapU(xy, x);
    });
  };

  // Public interface

  var of = function of(value) {
    return new Pure(value);
  };
  var chain = /*#__PURE__*/I.curry(chainU);
  var map = /*#__PURE__*/I.curry(mapU);
  var ap = /*#__PURE__*/I.curry(apU);

  var Free = { map: mapU, of: of, ap: apU, chain: chainU };

  var run = function run(term) {
    return isPure(term) ? term[VALUE] : throwExpectedPure(term);
  };

  var handler = /*#__PURE__*/I.curry(function handler(onPure, onEffect) {
    return function handler(term, state) {
      if (isPure(term)) {
        return onPure(term[VALUE], state);
      } else {
        var computation = void 0;
        var effect = void 0;
        if (isImpure(term)) {
          computation = term[COMPUTATION];
          effect = term[EFFECT];
        } else {
          computation = of;
          effect = term;
        }
        var continuation = function continuation(value, state) {
          return handler(applyTo(computation, value), state);
        };
        return onEffect(effect, continuation, state);
      }
    };
  });

  var runAsync = /*#__PURE__*/handler(resolve, function (e, k) {
    return isThenable(e) ? e.then(k) : chainU(k, e);
  });

  var VALUE$1 = 'v';

  var IVar = function IVar() {
    var value = void 0;
    var p = new Promise(function (resolve$$1) {
      return value = resolve$$1;
    });
    p[VALUE$1] = value;
    return p;
  };

  var FN = 'f';

  function From(fn) {
    this[FN] = fn;
  }

  var unravel = function unravel(fn) {
    var effectV = IVar();
    var resultV = void 0;

    var wait = function wait(e) {
      resultV = IVar();
      effectV[VALUE$1](e);
      return resultV;
    };

    fn(wait).then(function (r) {
      resultV = null;
      effectV[VALUE$1](r);
    });

    var onEffect = function onEffect(v_or_e) {
      if (resultV) {
        effectV = IVar();
        return chainU(onResult, v_or_e);
      } else {
        return of(v_or_e);
      }
    };

    var onResult = function onResult(v) {
      resultV[VALUE$1](v);
      return chainU(onEffect, effectV);
    };

    return chainU(onEffect, effectV);
  };

  var from = function from(fn) {
    return new From(fn);
  };

  var toAsync = /*#__PURE__*/handler(resolve, function (e, k) {
    return e instanceof From ? chainU(k, unravel(e[FN])) : chainU(k, e);
  });

  var Reader = function Reader() {
    var ask = new function Ask() {}();
    var run$$1 = I.curryN(2, function runReader(v) {
      return handler(of, function (e, k) {
        return e === ask ? k(v) : chainU(k, e);
      });
    });
    var local = I.curry(function local(vv, m) {
      return chainU(function (v) {
        return run$$1(vv(v), m);
      }, ask);
    });
    return { ask: ask, local: local, run: run$$1 };
  };

  var VALUE$2 = 'v';

  var State = function State() {
    var get = new function Get() {}();
    function Put(value) {
      this[VALUE$2] = value;
    }
    var put = function put(value) {
      return new Put(value);
    };
    var runner = handler(of, function (e, k, s) {
      return e === get ? k(s, s) : e instanceof Put ? k(undefined, e[VALUE$2]) : chainU(function (v) {
        return k(v, s);
      }, e);
    });
    var run$$1 = I.curry(function runState(s, m) {
      return runner(m, s);
    });
    var modify = function modify(ss) {
      return chainU(function (s0) {
        var s = ss(s0);
        return chainU(function () {
          return of(s);
        }, put(s));
      }, get);
    };
    return { get: get, put: put, modify: modify, run: run$$1 };
  };

  // The Free combinators

  exports.of = of;
  exports.chain = chain;
  exports.map = map;
  exports.ap = ap;
  exports.Free = Free;
  exports.run = run;
  exports.runAsync = runAsync;
  exports.from = from;
  exports.toAsync = toAsync;
  exports.handler = handler;
  exports.Reader = Reader;
  exports.State = State;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
