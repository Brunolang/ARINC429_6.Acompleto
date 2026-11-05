const express = require('express');
const path = require('path');
const db = require('./db');
const { generarPalabraARINC429 } = require('./arinc');
const { calcularTensionAuricular } = require('./audio');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Middleware para leer datos JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (la interfaz HTML)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// --- API: CRUD DE INSTRUMENTOS ---
// ==========================================

// Obtener todos los instrumentos (para llenar el combo en el frontend)
app.get('/api/instrumentos', async (req, res) => {
    try {
        const [filas] = await db.execute('SELECT * FROM instrumentos ORDER BY nombre');
        res.json(filas);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear un nuevo instrumento
app.post('/api/instrumentos', async (req, res) => {
    try {
        const { nombre, label, minimo, maximo } = req.body;
        const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
        const labelLimpio = typeof label === 'string' ? label.trim() : String(label ?? '');
        const minimoNumerico = Number(minimo);
        const maximoNumerico = Number(maximo);

        if (!nombreLimpio || !/^[0-7]{1,3}$/.test(labelLimpio) ||
            parseInt(labelLimpio, 8) > 255 ||
            minimo === '' || maximo === '' ||
            !Number.isFinite(minimoNumerico) || !Number.isFinite(maximoNumerico) ||
            minimoNumerico >= maximoNumerico) {
            return res.status(400).json({
                success: false,
                error: 'Ingrese nombre, label octal válido y un rango numérico donde el mínimo sea menor que el máximo.'
            });
        }

        const query = 'INSERT INTO instrumentos (nombre, label, minimo, maximo) VALUES (?, ?, ?, ?)';
        const [resultado] = await db.execute(query, [
            nombreLimpio, labelLimpio, minimoNumerico, maximoNumerico
        ]);
        res.status(201).json({ success: true, id: resultado.insertId });
    } catch (error) {
        const status = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
        const message = status === 409
            ? 'Ya existe un instrumento con ese nombre.'
            : error.message;
        res.status(status).json({ success: false, error: message });
    }
});

// Eliminar un instrumento
app.delete('/api/instrumentos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM instrumentos WHERE id = ?', [id]);
        res.json({ success: true, message: `Instrumento ${id} eliminado.` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ==========================================
// --- API: CRUD DE ENVÍOS (Actualizado) ---
// ==========================================

// --- API: CREAR ENVÍO ---
app.post('/api/envios', async (req, res) => {
    try {
        const { instrumento, valor } = req.body;
        if (typeof instrumento !== 'string' || !instrumento.trim() ||
            valor === '' || valor === null || valor === undefined ||
            !Number.isFinite(Number(valor))) {
            return res.status(400).json({ success: false, error: 'Seleccione un instrumento e ingrese un valor numérico.' });
        }
        
        // Buscamos la configuración del instrumento directamente en la Base de Datos
        const [rows] = await db.execute('SELECT * FROM instrumentos WHERE nombre = ?', [instrumento]);
        
        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: 'El instrumento seleccionado no existe.' });
        }

        const config = rows[0];
        const minimo = config.minimo;
        const maximo = config.maximo;

        const valorNumerico = Number(valor);
        if (valorNumerico < minimo || valorNumerico > maximo) {
            return res.status(400).json({
                success: false,
                error: `El valor debe estar entre ${minimo} y ${maximo}.`
            });
        }
        const palabra32bits = generarPalabraARINC429(config.label, valorNumerico, minimo, maximo);
        const tensionSalida = calcularTensionAuricular(valorNumerico, minimo, maximo);
        const palabraHex = `0x${palabra32bits.toString(16).toUpperCase().padStart(8, '0')}`;

        const query = `INSERT INTO envios
            (instrumento, valor, maximo, minimo, palabra_hex, tension)
            VALUES (?, ?, ?, ?, ?, ?)`;
        const [resultado] = await db.execute(query, [
            instrumento, valorNumerico, maximo, minimo, palabraHex, tensionSalida
        ]);
        res.status(201).json({
            success: true,
            id: resultado.insertId,
            hex: palabraHex,
            tension: tensionSalida,
            message: 'Trama procesada y envío guardado en el registro. No se transmitió a hardware.'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API: LEER ENVÍOS ---
app.get('/api/envios', async (req, res) => {
    try {
        const [filas] = await db.execute('SELECT * FROM envios ORDER BY id DESC');
        res.json(filas);
    } catch (error) {
        console.error('Error al consultar los envíos:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- API: EDITAR ENVÍO ---
app.put('/api/envios/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { instrumento, valor } = req.body;
        const valorNumerico = Number(valor);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, error: 'ID de envío inválido.' });
        }

        // Buscar configuración del instrumento en la BD
        const [rows] = await db.execute('SELECT * FROM instrumentos WHERE nombre = ?', [instrumento]);
        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Instrumento inválido.' });
        }
        const config = rows[0];

        if (valor === '' || valor === undefined || !Number.isFinite(valorNumerico)) {
            return res.status(400).json({ success: false, error: 'Valor inválido.' });
        }

        const [resultado] = await db.execute(
            'UPDATE envios SET instrumento = ?, valor = ?, maximo = ?, minimo = ? WHERE id = ?',
            [instrumento, valorNumerico, config.maximo, config.minimo, id]
        );

        if (resultado.affectedRows === 0) {
            const [filas] = await db.execute('SELECT id FROM envios WHERE id = ?', [id]);
            if (filas.length === 0) {
                return res.status(404).json({ success: false, error: 'Envío no encontrado.' });
            }
        }

        res.json({ success: true, message: `Registro ${id} actualizado.` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API: ELIMINAR ENVÍO ---
app.delete('/api/envios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM envios WHERE id = ?', [id]);
        res.json({ success: true, message: `Registro ${id} eliminado.` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de aviónica corriendo en http://localhost:${PORT}`);
});