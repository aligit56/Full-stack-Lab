function executeMathOperation(mathFunc, args){
    if (args.length === 0) {
        return 0;
    }
    if (args.length === 1) {
        return mathFunc(args[0]);
    }
    return args.map(num => mathFunc(num));
}

function absMe(...args) {
    return executeMathOperation(Math.abs, args);
}

function CeilingMe(...args) {
    return executeMathOperation(Math.ceil, args);
}       

function floorMe(...args) {
    return executeMathOperation(Math.floor, args);
}

console.log("absMe(): ", absMe( ));
console.log("absMe(-3.2): ", absMe(-3.2));
console.log("absMe(-3.2, 4.7, -5.5): ", absMe(-3.2, 4.7, -5.5));

console.log("CeilingMe(): ", CeilingMe( ));
console.log("CeilingMe(3.2): ", CeilingMe(3.2));
console.log("CeilingMe(3.2, 4.7, 5.5): ", CeilingMe(3.2, 4.7, 5.5));

console.log("floorMe(): ", floorMe( ));
console.log("floorMe(3.2): ", floorMe(3.2));
console.log("floorMe(3.2, 4.7, 5.5): ", floorMe(3.2, 4.7, 5.5));