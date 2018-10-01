import { resolve, isThenable, values, isFunction, constructorOf, inherit, curry, Monad, sndU, curryN, assocPartialU, id, always, arityN, defineNameU, isInstanceOfU } from 'infestines';

var setNameU = process.env.NODE_ENV === 'production' ? function (fn) {
  return fn;
} : defineNameU;

var copyNameU = process.env.NODE_ENV === 'production' ? function (fn) {
  return fn;
} : function (fn, from) {
  return defineNameU(fn, from.name);
};

var isInstanceOf = /*#__PURE__*/curry(isInstanceOfU);

var construct1 = function construct1(Type) {
  return copyNameU(function (x) {
    return new Type(x);
  }, Type);
};

// Debug

var showFn = function showFn(x) {
  return x.name || x.toString();
};

var showParams = function showParams(x) {
  var vs = values(x);
  return vs.length ? '(' + vs.map(show).join(', ') + ')' : '';
};

var show = function show(x) {
  return isFunction(x) ? showFn(x) : isInstanceOf(Object, x) && constructorOf(x) ? '' + showFn(constructorOf(x)) + showParams(x) : JSON.stringify(x);
};

// Computation queue

var PREFIX = 'p';
var SUFFIX = 's';

function Concat(prefix, suffix) {
  this[PREFIX] = prefix;
  this[SUFFIX] = suffix;
}

// Term representation

var Term = /*#__PURE__*/(process.env.NODE_ENV === 'production' ? function (fn) {
  return fn;
} : inherit)(function Term() {}, null, {
  toString: function toString() {
    return show(this);
  }
});

//

var VALUE = 'v';

var Pure = /*#__PURE__*/inherit(function Pure(value) {
  this[VALUE] = value;
}, Term);

var isPure = /*#__PURE__*/isInstanceOf(Pure);

//

var EFFECT = 'e';
var COMPUTATION = 'c';

var Impure = /*#__PURE__*/inherit(function Impure(effect, computation) {
  this[EFFECT] = effect;
  this[COMPUTATION] = computation;
}, Term);

var impure = function impure(effect, computation) {
  return new Impure(effect, computation);
};

var isImpure = /*#__PURE__*/isInstanceOf(Impure);

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

var of = /*#__PURE__*/construct1(Pure);
var chain = /*#__PURE__*/curry(chainU);
var map = /*#__PURE__*/curry(mapU);
var ap = /*#__PURE__*/curry(apU);

var Free = /*#__PURE__*/Monad(mapU, of, apU, chainU);

var run = function run(term) {
  return isPure(term) ? term[VALUE] : throwExpectedPure(term);
};

var Effect = /*#__PURE__*/inherit(function Effect() {}, Term);

var handler = /*#__PURE__*/curry(function handler(onPure, onEffect) {
  return function handler(term, state) {
    if (isPure(term)) {
      return onPure(term[VALUE], state);
    } else if (isImpure(term)) {
      var computation = term[COMPUTATION];
      var continuation = function continuation(value, state) {
        return handler(applyTo(computation, value), state);
      };
      return onEffect(term[EFFECT], continuation, state);
    } else {
      return onEffect(term, onPure, state);
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
var isFrom = /*#__PURE__*/isInstanceOf(From);

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

var from = /*#__PURE__*/construct1(From);

var toAsync = /*#__PURE__*/handler(resolve, function (e, k) {
  return isFrom(e) ? chainU(k, unravel(e[FN])) : chainU(k, e);
});

var last = { concat: sndU };

function Exception() {
  var _ref = arguments.length && arguments[0] || last,
      empty = _ref.empty,
      concat = _ref.concat;

  var Raise = inherit(function Raise(value) {
    this.value = value;
  }, Effect);
  var isRaise = isInstanceOf(Raise);
  var raise = construct1(Raise);
  var run$$1 = handler(of, function (e, k) {
    return isRaise(e) ? of(e) : chainU(k, e);
  });
  var handle = curryN(2, function (onRaise) {
    return handler(of, function (e, k) {
      return isRaise(e) ? onRaise(e.value) : chainU(k, e);
    });
  });
  var zero = empty ? raise(empty()) : undefined;
  var altU = function alt(l, r) {
    return handle(function (el) {
      return handle(function (er) {
        return raise(concat(el, er));
      }, r);
    }, l);
  };
  var alt = curry(altU);
  var semi = function alts(_) {
    var n = arguments.length;
    var r = arguments[--n];
    while (n) {
      var l = arguments[--n];
      r = altU(l, r);
    }
    return r;
  };
  var alts = zero ? function alts() {
    return arguments.length === 0 ? zero : semi.apply(null, arguments);
  } : semi;
  return assocPartialU('zero', zero, { raise: raise, handle: handle, alt: alt, alts: alts, run: run$$1 });
}

var Reader = function Reader() {
  var Ask = inherit(function Ask() {}, Effect);
  var ask = new Ask();
  var run$$1 = curryN(2, function runReader(v) {
    return handler(of, function (e, k) {
      return e === ask ? k(v) : chainU(k, e);
    });
  });
  var local = curry(function local(vv, m) {
    return chainU(function (v) {
      return run$$1(vv(v), m);
    }, ask);
  });
  return { ask: ask, local: local, run: run$$1 };
};

var VALUE$2 = 'v';

var State = function State() {
  var Get = inherit(function Get() {}, Effect);
  var get = new Get();
  var Put = inherit(function Put(value) {
    this[VALUE$2] = value;
  }, Effect);
  var isPut = isInstanceOf(Put);
  var put = construct1(Put);
  var runner = handler(of, function (e, k, s) {
    return e === get ? k(s, s) : isPut(e) ? k(undefined, e[VALUE$2]) : chainU(function continueState(v) {
      return k(v, s);
    }, e);
  });
  var run$$1 = curry(function runState(s, m) {
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

var join = function join(m) {
  return chainU(id, m);
};

var noop = /*#__PURE__*/of(undefined);

var alwaysNoop = /*#__PURE__*/always(noop);
var either = function either(onT, onF) {
  return function (b) {
    return b ? onT : onF;
  };
};

var when = /*#__PURE__*/curryN(2, /*#__PURE__*/setNameU( /*#__PURE__*/either(id, alwaysNoop), 'when'));
var unless = /*#__PURE__*/curryN(2, /*#__PURE__*/setNameU( /*#__PURE__*/either(alwaysNoop, id), 'unless'));

var pipe2U = function pipe2(l, r) {
  return function pipe2(x) {
    return chainU(r, l(x));
  };
};

function pipe() {
  var n = arguments.length;
  if (!n) return of;
  var r = arguments[--n];
  while (n) {
    r = pipe2U(arguments[--n], r);
  }return r;
}

function compose() {
  var n = arguments.length;
  if (!n) return of;
  var r = arguments[--n];
  while (n) {
    r = pipe2U(r, arguments[--n]);
  }return r;
}

function thru(m) {
  var n = arguments.length;
  for (var i = 1; i < n; ++i) {
    m = chainU(arguments[i], m);
  }return m;
}

var cons = function cons(l) {
  return function (r) {
    return [l, r];
  };
};
var toArray = function toArray(cs) {
  var r = [];
  while (cs) {
    r.push(cs[0]);
    cs = cs[1];
  }
  return r.reverse();
};

var sequence = function sequence(xs) {
  var n = xs.length;
  var r = of(null);
  for (var i = 0; i < n; ++i) {
    r = apU(mapU(cons, xs[i]), r);
  }return mapU(toArray, r);
};

var lift = function lift(fn) {
  var fnc = copyNameU(function (cs) {
    return fn.apply(null, toArray(cs));
  }, fn);
  return arityN(fn.length, copyNameU(function () {
    var n = arguments.length;
    var r = of(null);
    for (var i = 0; i < n; ++i) {
      r = apU(mapU(cons, arguments[i]), r);
    }return mapU(fnc, r);
  }, fn));
};

// The Free combinators

export { of, chain, map, ap, Free, run, runAsync, from, toAsync, Effect, handler, Exception, Reader, State, noop, thru, compose, pipe, join, unless, when, sequence, lift };
