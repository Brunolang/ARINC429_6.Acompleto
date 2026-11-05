const DATA_MIN = -(2 ** 18);
const DATA_MAX = (2 ** 18) - 1;
const DATA_MASK = (1n << 19n) - 1n;
const WORD_MASK = (1n << 32n) - 1n;

function reverseByte(value) {
    let reversed = 0;
    for (let bit = 0; bit < 8; bit += 1) {
        reversed = (reversed << 1) | ((value >> bit) & 1);
    }
    return reversed;
}

function generarPalabraARINC429(label, valor, minimo, maximo) {
    const labelText = String(label).trim();
    const labelOctal = /^[0-7]{1,3}$/.test(labelText) ? parseInt(labelText, 8) : NaN;
    const value = Number(valor);
    const min = Number(minimo);
    const max = Number(maximo);

    if (!Number.isInteger(labelOctal) || labelOctal > 0xff) {
        throw new RangeError('El label debe ser un valor octal entre 0 y 377.');
    }
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
        throw new RangeError('El valor y el rango del instrumento deben ser numéricos y válidos.');
    }
    if (value < min || value > max) {
        throw new RangeError(`El valor debe estar entre ${min} y ${max}.`);
    }

    const scaledValue = Math.round(
        DATA_MIN + ((value - min) / (max - min)) * (DATA_MAX - DATA_MIN)
    );
    const labelBits = BigInt(reverseByte(labelOctal));
    const dataBits = BigInt(scaledValue) & DATA_MASK;
    const ssmNormalOperation = 0b11n;

    let word = labelBits | (dataBits << 10n) | (ssmNormalOperation << 29n);
    let ones = 0;
    for (let bits = word; bits !== 0n; bits &= bits - 1n) {
        ones += 1;
    }
    if (ones % 2 === 0) {
        word |= 1n << 31n;
    }

    return word & WORD_MASK;
}

module.exports = { generarPalabraARINC429 };
