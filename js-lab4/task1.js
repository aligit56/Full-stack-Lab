var fullname = "Muhammad ALi";
var age =22;
var isStudent = true;
var gpa = 3.8;

var biography = {
    name: fullname,
    age: age,
    isStudent: isStudent,
    gpa: gpa,
    address :{
        street: "Air University",
        city : "Islamabad",
        country: "Pakistan"
    },
    degreeProgram :{
        title: "BSCS",
        university: "Air University",
        semester : 5
    }
};

console.log("Biography Details:");
console.log("Name: " + biography.name);
console.log("Age: " + biography.age);
console.log("Is Student: " + biography.isStudent);
console.log("GPA: " + biography.gpa);
console.log("Address: " + biography.address.street + ", " + biography.address.city + ", " + biography.address.country);
console.log("Degree Program: " + biography.degreeProgram.title + ", " + biography.degreeProgram.university + ", Semester: " + biography.degreeProgram.semester);