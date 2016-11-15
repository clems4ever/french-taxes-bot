
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());

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
    if(reductions) {
        impotNet -= reductions;
    }
    if(credit_impot) {
        impotNet -= credit_impot;
    }
    if(prime_emploi) {
        impotNet -= prime_emploi;
    }

    results.impot_brut = taxAmount;
    results.impot_net = impotNet;
    results.taux_moyen_imposition = taxAmount / revenueNetImposable;
    results.taux_marginal_imposition = taux_marginal;
    return results; 
}



module.exports = {
    computeImpots: computeImpots;
    computeQuotientFamilial: computeQuotientFamilial,
    computeChildrenParts: computeChildrenParts
};
