function roundMe(...args) {
   if (args.length === 0) {
       return 0;
   }
   if (args.length === 1) {
       return Math.round(args[0]);
   }
   return args.map(num => Math.round(num));
}

console.log(roundMe());
console.log(roundMe(3.2));
console.log(roundMe(3.2, 4.7, 5.5));
