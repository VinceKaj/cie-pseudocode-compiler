//https://stackoverflow.com/questions/2449182/getter-setter-on-javascript-array


var arr = new Proxy(Array(100).fill(null), {
  get: (target, name) => { if (name < 1 || name >= 101) throw(`Out of bounds`); else return target[name-1] },
  set: (target, name, value) => { if (name < 1 || name >= 101) throw(`Out of bounds`); target[name-1] = value },
});

// arr[0] = "defined"

// arr[0]

arr[100] = "Hehe"

console.log(arr[100])

console.log(Object.keys(arr).length)

// arr [5] = require('prompt-sync')()()*1;
// arr [6] = require('prompt-sync')()()*1;

