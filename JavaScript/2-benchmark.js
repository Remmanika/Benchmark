'use strict';

const benchmark = {};
module.exports = benchmark;

const PRE_COUNT = 1000;

const OPT_STATUS = [
  /* 0*/ 'unknown',
  /* 1*/ 'optimized',
  /* 2*/ 'not optimized',
  /* 3*/ 'always optimized',
  /* 4*/ 'never optimized',
  /* 5*/ 'unknown',
  /* 6*/ 'maybe deoptimized',
  /* 7*/ 'turbofan optimized'
];

const OPT_BITS = [
  /*  1 */ 'function',
  /*  2 */ 'never',
  /*  4 */ 'always',
  /*  8 */ 'maybe',
  /* 16 */ 'opt',
  /* 32 */ 'turbofan',
  /* 64 */ 'interpreted'
];

const status = fn => %GetOptimizationStatus(fn);

const opt = fn => {
  const optStatus = status(fn);
  const results = [];
  OPT_BITS.forEach((name, n) => {
    if (n === 0) return;
    if (Math.pow(2, n) & optStatus) results.push(name);
  });
  return  results.length ? results.join(',') : '---';
}

const optimize = fn => %OptimizeFunctionOnNextCall(fn);

const rpad = (s, char, count) => (s + char.repeat(count - s.length));
const lpad = (s, char, count) => (char.repeat(count - s.length) + s);

const relativePercent = (best, time) => {
  const relative = time * 100 / best;
  const result = Math.round(Math.round(relative * 100) / 100) - 100;
  return result;
}

console.log('\nname time (nanoseconds) status: begin opt heat loop\n');

benchmark.do = (count, tests) => {
  const times = tests.map((fn) => {
    const result = [];
    let i;
    const optBefore = opt(fn);
    optimize(fn);
    fn();
    const optAfter = opt(fn);
    for (i = 0; i < PRE_COUNT; i++) result.push(fn());
    const optAfterHeat = opt(fn);
    const begin = process.hrtime();
    for (i = 0; i < count; i++) result.push(fn());
    const end = process.hrtime(begin);
    const optAfterLoop = opt(fn);
    const diff = end[0] * 1e9 + end[1];
    const time = lpad(diff.toString(), '.', 15);
    const name = rpad(fn.name, '.', 25);
    const iterations = result.length - PRE_COUNT;
    console.log(
      `${name}${time} ${optBefore} ${optAfter} ${optAfterHeat} ${optAfterLoop}`
    );
    return { name, time: diff };
  });
  console.log();
  const top = times.sort((t1, t2) => (t1.time - t2.time));
  const best = top[0].time;
  top.forEach((test) => {
    test.percent = relativePercent(best, test.time);
    const time = lpad(test.time.toString(), '.', 15);
    const percent = lpad((
      test.percent === 0 ? 'min' : '+' + test.percent + '%'
    ), '.', 10);
    console.log(test.name + time + percent);
  });
};
