const test = require('node:test');
const assert = require('node:assert/strict');
const { generarPalabraARINC429 } = require('../arinc');

const DATA_MASK = (1n << 19n) - 1n;

function countBits(value) {
    let count = 0;
    for (let bits = value; bits !== 0n; bits &= bits - 1n) {
        count += 1;
    }
    return count;
}

test('genera una palabra de 32 bits con paridad impar y SSM normal', () => {
    const word = generarPalabraARINC429('203', 0, -100, 100);

    assert.equal(word >> 32n, 0n);
    assert.equal(countBits(word) % 2, 1);
    assert.equal((word >> 29n) & 0b11n, 0b11n);
});

test('escala los extremos del rango al dato BNR firmado de 19 bits', () => {
    const minWord = generarPalabraARINC429('203', -100, -100, 100);
    const maxWord = generarPalabraARINC429('203', 100, -100, 100);

    assert.equal((minWord >> 10n) & DATA_MASK, 1n << 18n);
    assert.equal((maxWord >> 10n) & DATA_MASK, (1n << 18n) - 1n);
});

test('rechaza labels y valores fuera de rango', () => {
    assert.throws(() => generarPalabraARINC429('400', 0, -1, 1), RangeError);
    assert.throws(() => generarPalabraARINC429('203', 2, -1, 1), RangeError);
});
