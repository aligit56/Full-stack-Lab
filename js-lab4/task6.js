function sumOfMultiples(x,y,z) {
    let sum = 0;
    for (let i = 1; i < z; i++) {
        if (i % x === 0 || i % y === 0) {
            sum += i;
        }
    }
    return sum;
}

let result = sumOfMultiples(3, 5, 10);
console.log("The sum of all multiples of 3 or 5 below 10 is: " + result);