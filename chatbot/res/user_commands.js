/*
The MIT License (MIT)
Copyright (c) 2016 - Clement Michaud, Sergei Kireev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var redis = require('redis');
var REDIS_HOST = process.env.REDIS_HOST || 'localhost';
var client = redis.createClient('redis://'+ REDIS_HOST + ':6379');

var tranches = [
    [0, [0, 0]],
    [9700, [0.14, 1358]],
    [26791, [0.3, 5644.56]],
    [71826, [0.41, 13545.42]],
    [152108, [0.45, 19629.74]],
];

function computeChildrenParts(childrenNumber) {
    var childrenParts = 0;
    if(childrenNumber == 1) {
        childrenParts = 0.5
    }
    else if(childrenNumber > 1) {
        childrenParts = childrenNumber - 1;
    }
    
    return childrenParts;
}

function computeQuotientFamilial(adultsNumber, childrenNumber) {
    return adultsNumber + computeChildrenParts(childrenNumber);
}


function computeDecote(impotBrut, adultsNumber) {
    var decote = 0;
    if(adultsNumber == 1 && impotBrut <= 1553) {
        decote = 1165 - (3 / 4) * impotBrut;
    }
    if(adultsNumber == 2 && impotBrut <= 2560) {
        decote = 1920 - (3 / 4) * impotBrut;
    }
    
    return decote;
}

function computeImpots(revenueNetImposable, adultsNumber, childrenNumber, reductions, credit_impot, prime_emploi) {
    var quotientFamilial = computeQuotientFamilial(adultsNumber, childrenNumber);
    var revenueNetImposableParPart = revenueNetImposable / quotientFamilial;
    var taxAmount = 0;
    var impotNet = 0;
    var taux_marginal = 0;

    var results = {
        revenue_net_imposable_par_part: revenueNetImposableParPart,
        impot_brut: 0,
        impot_net: 0,
        taux_moyen_imposition: 0,
        taux_marginal_imposition: 0,
        quotient_familial: quotientFamilial
    }


    for(var i=0; i<tranches.length - 1; ++i) {
        if(revenueNetImposableParPart > tranches[i][0] &&
           revenueNetImposableParPart <= tranches[i+1][0]) {
            taxAmount = (revenueNetImposable * tranches[i][1][0]) - (quotientFamilial * tranches[i][1][1]);
            taux_marginal = tranches[i][1][0];
        }
    }

    var upperTranche = tranches[tranches.length - 1]
    if(revenueNetImposableParPart > upperTranche[0]) {
        taxAmount = (revenueNetImposable * upperTranche[1][0]) - (quotientFamilial * upperTranche[1][1]);
        taux_marginal = upperTranche[1][0];
    }

    impotNet = taxAmount;
    
    var decote = computeDecote(taxAmount, adultsNumber); 
    impotNet -= decote;
    
    if(reductions) {
        impotNet -= reductions;
    }
    if(credit_impot) {
        impotNet -= credit_impot;
    }
    if(prime_emploi) {
        impotNet -= prime_emploi;
    }
    
    if(impotNet < 0) {
        impotNet = 0;
    } 

    results.impot_brut = taxAmount;
    results.impot_net = impotNet;
    results.taux_moyen_imposition = impotNet / revenueNetImposable;
    results.taux_marginal_imposition = taux_marginal;
    results.decote = decote;
    return results; 
}



function pluriel(number, word) {
    var w = '' + number + word;
    if(number > 1) {
        w += 's';
    }
    return w;
}



function getContext(sessionId, fn)
{
    client.get(sessionId, function(error, context) {
        ctx = JSON.parse(context);
        fn(error, ctx);
    });
}

function setContext(sessionId, context, fn) {
    client.set(sessionId, JSON.stringify(context), fn);
}

function updateContext(sessionId, key, value, fn) {
    getContext(sessionId, function(error, context) {
        context[key] = value;
        setContext(sessionId, ctx, fn);
    });
}

function computeImpotFromContext(sessionId, next) {
    getContext(sessionId, function(error, ctx) {
        var r = computeImpots(ctx.revenus, ctx.adultsNumber, ctx.childrenNumber, ctx.reductions, ctx.credit_impot, ctx.prime_emploi);

        var replyVariables = {};
        replyVariables['0'] = '' + r.impot_net.toFixed(2);
        replyVariables['1'] = '' + (r.taux_moyen_imposition * 100.0).toFixed(1);
        
        next(replyVariables);
    });
}


module.exports = {
    "#marie_ou_pacse": function(intentVariables, sessionId, next) {
        var replyVariables = {}
        var adultsNumber = 1;
        if('situation0' in intentVariables) {
            var situation = intentVariables['situation0'];
            if(situation == 'Marié' || situation == 'Pacsé') {
                adultsNumber = 2;
            }
        }
        
        if('oui0' in intentVariables) {
            adultsNumber = 2;
        }
        
        replyVariables['0'] = '' + pluriel(adultsNumber, ' part');
        
        var context = {
            adultsNumber: 1,
            childrenNumber: 0,
            revenus: 0,
            credit_impot: 0,
            prime_emploi: 0,
            reductions: 0
        };
        
        context.adultsNumber = adultsNumber;
        
        setContext(sessionId, context, function (err) {
            next(replyVariables);
        });
    },
    
    "#reply_nb_enfants": function(intentVariables, sessionId, next) {
        var replyVariables = {};
        var childrenNumber = 0;
        if('number0' in intentVariables) {
            childrenNumber = parseInt(intentVariables['number0']);
        }
        
        getContext(sessionId, function(error, context) {
            var childrenPart = computeChildrenParts(childrenNumber);
            var quotientFamilial = computeQuotientFamilial(context.adultsNumber, childrenNumber);
            
            replyVariables['0'] = '' + quotientFamilial;
            
            context.childrenNumber = childrenNumber;
            setContext(sessionId, context, function(error) {
                next(replyVariables);
            });
        });
    },
    "#reply_revenus": function(intentVariables, sessionId, next) {
        var replyVariables = {};
        
        var revenus = 0;
        if('amount0' in intentVariables) {
            revenus = parseFloat(intentVariables['amount0']);
        }
        
        if('number0' in intentVariables) {
            revenus = parseFloat(intentVariables['number0']);
        }
        
        replyVariables['0'] = '' + revenus + '€';
        
        updateContext(sessionId, 'revenus', revenus, function(error) {
            next(replyVariables);
        });
    },
    "#reply_credit_impot": function(intentVariables, sessionId, next) {
        var credit_impot = 0;
        if('amount0' in intentVariables) {
            credit_impot = parseFloat(intentVariables['amount0']);
        }
        
        if('number0' in intentVariables) {
            credit_impot = parseFloat(intentVariables['number0']);
        }
        
        updateContext(sessionId, 'credit_impot', credit_impot, function(error) {
            next();
        });
    },
    "#reply_prime_emploi": function(intentVariables, sessionId, next) {
        var prime_emploi = 0;        
        if('amount0' in intentVariables) {
            prime_emploi = parseFloat(intentVariables['amount0']);
        }
        
        if('number0' in intentVariables) {
            prime_emploi = parseFloat(intentVariables['number0']);
        }
        
        updateContext(sessionId, 'prime_emploi', prime_emploi, function(error) {
            next();
        });
    },
    "#reply_reductions": function(intentVariables, sessionId, next) {     
        var reductions = 0;   
        if('amount0' in intentVariables) {
            reductions = parseFloat(intentVariables['amount0']);
        }
        
        if('number0' in intentVariables) {
            reductions = parseFloat(intentVariables['number0']);
        }
                
        computeImpotFromContext(sessionId, next);
    },
    "#compute_impot": function(intentVariables, sessionId, next) {
        computeImpotFromContext(sessionId, next);
    }
}
