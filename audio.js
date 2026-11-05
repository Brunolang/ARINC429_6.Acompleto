function calcularTensionAuricular(valor, minimo, maximo) {
    const value = Number(valor);
    const min = Number(minimo);
    const max = Number(maximo);

    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
        throw new RangeError('El valor y el rango del instrumento deben ser numéricos y válidos.');
    }
    if (value < min || value > max) {
        throw new RangeError(`El valor debe estar entre ${min} y ${max}.`);
    }

    return Number((((value - min) / (max - min)) * 5).toFixed(2));
}

module.exports = { calcularTensionAuricular };
