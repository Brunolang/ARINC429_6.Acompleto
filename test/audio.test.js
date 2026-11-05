const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularTensionAuricular } = require('../audio');

test('escala linealmente el mínimo, punto medio y máximo a 0-5 V', () => {
    assert.equal(calcularTensionAuricular(-100, -100, 100), 0);
    assert.equal(calcularTensionAuricular(0, -100, 100), 2.5);
    assert.equal(calcularTensionAuricular(100, -100, 100), 5);
});

test('rechaza valores fuera del rango del instrumento', () => {
    assert.throws(() => calcularTensionAuricular(101, -100, 100), RangeError);
});
