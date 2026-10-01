function isPrime(num) {
    if (num <= 1) return false;
    for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) return false;
    }
    return true;
}

let currentPrime = 11;

let nextNum = currentPrime + 1;
while (!isPrime(nextNum)) {
    nextNum++;
}

console.log("The next prime number after " + currentPrime + " is: " + nextNum);