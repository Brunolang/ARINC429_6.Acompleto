const db = require('./db'); // Asegúrate de que apunte a tu conexión de MySQL

async function inicializarTablas() {
    try {
        // Tabla de instrumentos (CRUD de instrumentos)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS instrumentos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL UNIQUE,
                label VARCHAR(10) NOT NULL,
                minimo FLOAT NOT NULL,
                maximo FLOAT NOT NULL
            );
        `);

        // Tabla de envíos existente, relacionada
        await db.execute(`
            CREATE TABLE IF NOT EXISTS envios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                instrumento VARCHAR(100) NOT NULL,
                valor FLOAT NOT NULL,
                maximo FLOAT NOT NULL,
                minimo FLOAT NOT NULL,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("¡Tablas creadas o verificadas con éxito!");
        process.exit(0);
    } catch (error) {
        console.error("Error al crear las tablas:", error.message);
        process.exit(1);
    }
}

inicializarTablas();