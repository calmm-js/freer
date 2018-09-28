import { isFunction, id, inherit, curry, curryN } from 'infestines';

var isThenable = function isThenable(x) {
  return null != x && isFunction(x.then);
};

var resolve = function resolve(x) {
  return Promise.resolve(x);
};

// Computation queue

var PREFIX = 'p';
var SUFFIX = 's';

var names = function names(c) {
  return isFunction(c) ? [c.name || '' + c] : names(c[PREFIX]).concat(names(c[SUFFIX]));
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

var Impure = /*#__PURE__*/(process.env.NODE_ENV === 'production' ? id : function (Impure) {
  return inherit(Impure, Object, {
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
  while (!isFunction(computation)) {
    var head = computation[PREFIX];
    computation = computation[SUFFIX];
    while (!isFunction(head)) {
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
var chain = /*#__PURE__*/curry(chainU);
var map = /*#__PURE__*/curry(mapU);
var ap = /*#__PURE__*/curry(apU);

var Free = { map: mapU, of: of, ap: apU, chain: chainU };

var run = function run(term) {
  return isPure(term) ? term[VALUE] : throwExpectedPure(term);
};

var handler = /*#__PURE__*/curry(function (onPure, onEffect) {
  return function loop(term, state) {
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
        return loop(applyTo(computation, value), state);
      };
      return onEffect(effect, continuation, state);
    }
  };
});

var runAsync = /*#__PURE__*/handler(resolve, function (e, k) {
  return isThenable(e) ? e.then(k) : chain(k, e);
});

var IVar = function IVar() {
  var fill = void 0;
  var p = new Promise(function (resolve$$1) {
    return fill = resolve$$1;
  });
  p.fill = fill;
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
    effectV.fill(e);
    return resultV;
  };

  fn(wait).then(function (r) {
    resultV = null;
    effectV.fill(r);
  });

  var onEffect = function onEffect(v_or_e) {
    if (resultV) {
      effectV = IVar();
      return chain(onResult, v_or_e);
    } else {
      return of(v_or_e);
    }
  };

  var onResult = function onResult(v) {
    resultV.fill(v);
    return chain(onEffect, effectV);
  };

  return chain(onEffect, effectV);
};

var from = function from(fn) {
  return new From(fn);
};

var toAsync = /*#__PURE__*/handler(resolve, function (e, k) {
  return e instanceof From ? chain(k, unravel(e[FN])) : chain(k, e);
});

var Reader = function Reader() {
  var ask = new function Ask() {}();
  var run$$1 = curryN(2, function (v) {
    return handler(of, function (e, k) {
      return e === ask ? k(v) : chain(k, e);
    });
  });
  var local = curry(function (vv, m) {
    return chain(function (v) {
      return run$$1(vv(v), m);
    }, ask);
  });
  return { ask: ask, local: local, run: run$$1 };
};

var State = function State() {
  var get = new function Get() {}();
  function Put(value) {
    this.value = value;
  }
  var put = function put(value) {
    return new Put(value);
  };
  var runner = handler(of, function (e, k, s) {
    return e === get ? k(s, s) : e instanceof Put ? k(undefined, e.value) : chain(function (v) {
      return k(v, s);
    }, e);
  });
  var run$$1 = curry(function (s, m) {
    return runner(m, s);
  });
  var modify = function modify(ss) {
    return chain(function (s0) {
      var s = ss(s0);
      return chain(function () {
        return of(s);
      }, put(s));
    }, get);
  };
  return { get: get, put: put, modify: modify, run: run$$1 };
};

// The Free combinators

export { of, chain, map, ap, Free, run, runAsync, from, toAsync, handler, Reader, State };
