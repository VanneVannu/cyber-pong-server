const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Permite conexiones seguras cruzadas

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite que tu frontend de Render se conecte sin bloqueos
        methods: ["GET", "POST"]
    }
});

// Almacén de las salas activas en memoria del servidor
const salas = {};

io.on('connection', (socket) => {
    console.log(`Usuario conectado a la red arcade: ${socket.id}`);

    // Un jugador crea una sala con su código amarillo
    socket.on('crear_sala', (salaId) => {
        socket.join(salaId);
        salas[salaId] = { host: socket.id, invitado: null };
        console.log(`Sala creada: ${salaId} por Host: ${socket.id}`);
    });

    // El segundo jugador introduce el código y se conecta
    socket.on('unirse_sala', (salaId) => {
        if (salas[salaId]) {
            socket.join(salaId);
            salas[salaId].invitado = socket.id;
            console.log(`Invitado: ${socket.id} se unió a la sala: ${salaId}`);
            
            // Avisamos al creador que el rival ya entró
            io.to(salas[salaId].host).emit('rival_conectado');
        } else {
            socket.emit('error_sala', 'SALA NO ENCONTRADA');
        }
    });

    // Retransmisor universal de paquetes (Chat, Saques, Coordenadas)
    socket.on('enviar_paquete', ({ salaId, datos }) => {
        // Envía el mensaje a todos los de la sala excepto a quien lo emitió
        socket.to(salaId).emit('recibir_paquete', datos);
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor de red Cyber Pong corriendo en puerto ${PORT}`);
});
