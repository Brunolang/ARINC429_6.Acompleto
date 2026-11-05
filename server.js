const express = require('express');
const path = require('path');
const db = require('./db');
const { generarPalabraARINC429, enviarPorSerial } = require('./arinc');
const { calcularTensionAuricular } = require('./audio');

const app = express();
const PORT = 3000;

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
        const [filas] = await db.execute('SELECT * FROM instrumentos');
        res.json(filas);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear un nuevo instrumento
app.post('/api/instrumentos', async (req, res) => {
    try {
        const { nombre, label, minimo, maximo } = req.body;
        const query = 'INSERT INTO instrumentos (nombre, label, minimo, maximo) VALUES (?, ?, ?, ?)';
        const [resultado] = await db.execute(query, [nombre, label, Number(minimo), Number(maximo)]);
        res.json({ success: true, id: resultado.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
        
        // Buscamos la configuración del instrumento directamente en la Base de Datos
        const [rows] = await db.execute('SELECT * FROM instrumentos WHERE nombre = ?', [instrumento]);
        
        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: 'El instrumento seleccionado no existe.' });
        }

        const config = rows[0];
        const minimo = config.minimo;
        const maximo = config.maximo;
        const label = config.label;

        // 1. Guardar en MySQL
        const query = 'INSERT INTO envios (instrumento, valor, maximo, minimo) VALUES (?, ?, ?, ?)';
        const [resultado] = await db.execute(query, [instrumento, Number(valor), maximo, minimo]);

        // 2. Generar ARINC 429
        const palabra32bits = generarPalabraARINC429(label, valor);

        // 3. Transmisión Serial segura
        enviarPorSerial(palabra32bits);

        // 4. Calcular tensión para auricular
        const tensionSalida = calcularTensionAuricular(Number(valor), minimo, maximo);

        res.json({
            success: true,
            id: resultado.insertId,
            hex: `0x${palabra32bits.toString(16).toUpperCase()}`,
            tension: tensionSalida
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