function FizzBuzz(iterations: number) {
let i: number
let str: string

for(i = 1; i <= iterations; i++) {
str = ""
if(i % 3 === 0) {
str = str + "Fizz"
}

if(i % 5 === 0) {
str = str + "Buzz"
}

console.log(i, str)
}
}

FizzBuzz(100)