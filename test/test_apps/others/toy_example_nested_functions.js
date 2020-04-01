
let calculateAmortization = (principal, years, rate) => {
    let monthlyRate = principal / years;
    let monthlyPayment = rate / years;;
    let balance = principal;
    let amortization = [];
    for (let y = 0; y < years; y++) {
        let interestY = 0; //Interest payment for year y
        let principalY = 0; //Principal payment for year y
        for (let m = 0; m < 12; m++) {
            let interestM = balance * monthlyRate; //Interest payment for month m
            let principalM = monthlyPayment - interestM; //Principal payment for month m
            interestY = interestY + interestM;
            principalY = principalY + principalM;
            balance = balance - principalM;
            if (balance < 3) { 
                return balance;
            }
        }
        amortization.push({
            principalY,
            interestY,
            balance
        });
    }
    return monthlyPayment;
};

function blah2(anotherValue2) {
    return anotherValue2[1] == 'a';
}

function blah3(anotherValue3) {
    return anotherValue3[0] == 'P';
}

function getLength(value) {
    if (value) {
        return value.length;
    }
}

function blah(someValue) {
    return meh(someValue);
    // return function Level1(someValue) {
    //     return function Level2(someValue) {
    //         return function Level3(someValue) {
    //             return function Level4(someValue) {
    //                 if (typeof(someValue) === 'string') {
    //                     if (getLength(someValue) > 6) {
    //                         if (getLength(someValue) < 10) {
    //                             if (blah3(someValue) === 'P') {
    //                                 if (blah2(someValue) === 'a') {
    //                                     if ('Passwo' === someValue.substring(0, 6)) {
    //                                         if (someValue === 'Password1') {
    //                                             console.log('1');
    //                                             return 1;
    //                                         }
    //                                     }
    //                                 }
    //                             }
    //                         }
    //                     }
    //                 }
    //             }(someValue);
    //         }(someValue);
    //     }(someValue);
    // }(someValue);
};
exports.blah = blah;
