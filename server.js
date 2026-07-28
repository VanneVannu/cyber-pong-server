const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Base de datos temporal en memoria del servidor
const salas = {};

// Ruta para crear una sala con el código amarillo
app.post('/crear-sala', (req, res) => {
    const { salaId } = req.body;
    salas[salaId] = { datos: [], timestamp: Date.now() };
    console.log(`Sala creada en la nube: ${salaId}`);
    res.json({ status: "SALA_CREADA" });
});

// NUEVA RUTA DE EMERGENCIA: Vacía el historial de la sala tras un gol para evitar el efecto fantasma
app.post('/limpiar-sala', (req, res) => {
    const { salaId } = req.body;
    if (salas[salaId]) {
        salas[salaId].datos = []; // Borramos todos los paquetes rezagados de golpe
        console.log(`Cola de mensajes limpiada para la sala: ${salaId}`);
        res.json({ status: "SALA_LIMPIA" });
    } else {
        res.status(404).json({ error: "SALA_NO_ENCONTRADA" });
    }
});

// Ruta para enviar mensajes del chat, saques o coordenadas
app.post('/enviar', (req, res) => {
    const { salaId, emisor, contenido } = req.body;
    if (salas[salaId]) {
        // Guardamos el paquete en la sala con una marca de tiempo única
        salas[salaId].datos.push({ emisor, contenido, stamp: Date.now() });
        // Limpieza: mantenemos sólo los últimos 15 paquetes para evitar saturar la memoria
        if (salas[salaId].datos.length > 15) salas[salaId].datos.shift();
        res.json({ status: "ENVIADO" });
    } else {
        res.status(404).json({ error: "SALA_NO_ENCONTRADA" });
    }
});

// Ruta de consulta continua (Polleo) para leer lo que envió el rival
app.get('/escuchar/:salaId', (req, res) => {
    const { salaId } = req.params;
    if (salas[salaId]) {
        res.json({ datos: salas[salaId].datos });
    } else {
        res.status(404).json({ error: "SALA_NO_ENCONTRADA" });
    }
});

// Limpieza automática global cada 2 horas para salas abandonadas
setInterval(() => {
    const ahora = Date.now();
    for (const id in salas) {
        if (ahora - salas[id].timestamp > 7200000) delete salas[id];
    }
}, 3600000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Cerebro HTTP operando en puerto ${PORT}`));
