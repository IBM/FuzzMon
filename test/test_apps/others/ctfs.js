// line 6
function lvl1(password) {
    var u = 'admin';
    var p = password; // = JavaScriptIsSecure
    if (u == "admin" && p == String.fromCharCode(74, 97, 118, 97, 83, 99, 114, 105, 112, 116, 73, 115, 83, 101, 99, 117, 114, 101)) {
        return 1;
    } else {
        return 0;
    }
};

// line 16
function lvl2(password) {
    var p = password; // = adminz
    if (Sha1.hash(p) == "b89356ff6151527e89c4f3e3d30c8e6586c63962") {
        return 1;
    } else {
        return 0;
    }
};

// line 27
function lvl3(password) {
    var _0xf382x1 = password; // 02l1alk3 
    var _0xf382x2 = 'alk3';
    if (_0xf382x1 == '02l1' + _0xf382x2) {
        return 1;
    } else {
        return 0;
    };
};

// line 51
function lvl4(password) {
    var k = new Array(176, 214, 205, 246, 264, 255, 227, 237, 242, 244, 265, 270, 283);
    var u = 'administrator';
    var p = password; // OhLord4309111
    var t = true;

    if (u == "administrator") {
        for (i = 0; i < u.length; i++) {
            if ((u.charCodeAt(i) + p.charCodeAt(i) + i * 10) != k[i]) {
                t = false;
                break;
            }
        }
    } else {
        t = false;
    }
    if (t) {
        return 1;
    }
    return 0;
};

///////////////////// LVL5 /////////////////////
function curry(orig_func) {
    var ap = Array.prototype,
        args = arguments;

    function fn() {
        ap.push.apply(fn.args, arguments);
        return fn.args.length < orig_func.length ? fn : orig_func.apply(this, fn.args);
    }

    return function() {
        fn.args = ap.slice.call(args, 1);
        return fn.apply(this, arguments);
    };
}

function callback(x, y, i, a) {
    return !y.call(x, a[a["length"] - 1 - i].toString().slice(19, 21)) ? x : {};
}

var ref = {
    T: "BG8",
    J: "jep",
    j: "M2L",
    K: "L23",
    H: "r1A"
};

// line 105
function lvl5(key) { // key = ABGH-3jeK-LM2j-pL2J-8r1T
    e = false;
    var _strKey = "";
    try {
        _strKey = key;
        var a = _strKey.split("-");
        if (a.length !== 5) {
            e = true;
        }

        var o = a.map(genFunc).reduceRight(callback, new(genFunc(a[4]))(Function));

        if (!equal(o, ref))
            e = true;

    } catch (e) {
        e = true;
    }

    if (!e) {
        return 1;
    } else {
        return 0;
    }
}

function equal(o, o1) {
    var keys1 = Object.keys(o1);
    var keys = Object.keys(o);
    if (keys1.length != keys.length)
        return false;

    for (var i = 0; i < keys.length; i++)
        if (keys[i] != keys1[i] || o[keys[i]] != o1[keys1[i]])
            return false;

    return true;

}

function hook(f1, f2, f3) {
    return function(x) {
        return f2(f1(x), f3(x));
    };
}

var h = curry(hook);
var fn = h(function(x) {
    return x >= 48;
}, new Function("a", "b", "return a && b;"));

function genFunc(_part) {
    if (!_part || !(_part.length) || _part.length !== 4)
        return function() {};

    return new Function(_part.substring(1, 3), "this." + _part[3] + "=" + _part.slice(1, 3) + "+" + (fn(function(y) {
        return y <= 57
    })(_part.charCodeAt(0)) ? _part[0] : "'" + _part[0] + "'"));
}

exports.lvl1 = lvl1;
exports.lvl2 = lvl2;
exports.lvl3 = lvl3;
exports.lvl4 = lvl4;
exports.lvl5 = lvl5;
