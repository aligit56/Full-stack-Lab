function createPhoneNumber(numbers) {
  let areaCode = numbers.slice(0, 3).join('');
  let prefix = numbers.slice(3, 6).join('');
  let lineNumber = numbers.slice(6).join('');
  return `(${areaCode}) ${prefix}-${lineNumber}`;
}


console.log(createPhoneNumber([1, 2, 3, 4, 5, 6, 7, 8, 9, 0])); // Output: (123) 456-7890
