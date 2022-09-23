//https://stackoverflow.com/questions/2449182/getter-setter-on-javascript-array


// var arr = new Proxy(Array(100).fill(null), {
//   get: (target, name) => { if (name < 1 || name >= 101) throw(`Out of bounds`); else return target[name-1] },
//   set: (target, name, value) => { if (name < 1 || name >= 101) throw(`Out of bounds`); target[name-1] = value },
// });

// arr[0] = "defined"

// arr[0]

// arr[100] = "Hehe"

// console.log(arr[100])

// console.log(Object.keys(arr).length)

// arr [5] = require('prompt-sync')()()*1;
// arr [6] = require('prompt-sync')()()*1;


// const Arr = (min, max, arrName, fills=null) => {
//   return new Proxy(Array(max - min + 1).fill(fills), {
//     get: (target, name) => { if (name < min || name > max) throw (`${arrName} out of bounds`); return target[name - min] },
//     set: (target, name, value) => { if (name < min || name > max) throw (`${arrName} out of bounds`); target[name - min] = value }
//   });
// }

// let my2DArr = Arr(0,9,"my1DArr",Arr(0,9,"my2DArr"));


// // console.log([Object.keys(my2DArr).length, Object.keys(my2DArr[0]).length])

// my2DArr[0][0] = "Not a null value"

// console.log(my2DArr[0])

// my2DArr[-1][9] = "something else"




// console.log(LCASE('a'))

// console.log(LCASE('B'))

// console.log(LCASE('an'))


try {
  throw("something")
} catch (e) {
  let lineNumber = 
  console.log(e)
}