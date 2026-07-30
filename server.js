const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Desactiva bloqueos de seguridad del navegador

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite que tu frontend de Render se conecte sin restricciones CORS
        methods: ["GET", "POST"]
    }
});

// Diccionario en memoria del servidor para registrar las arenas activas
const salas = {};

io.on('connection', (socket) => {
    console.log(`Dispositivo enlazado a la red arcade: ${socket.id}`);

    // El Host crea la sala de vectores con su ID amarillo
    socket.on('crear_sala', (salaId) => {
        socket.join(salaId);
        salas[salaId] = { host: socket.id, invitado: null };
        console.log(`Sala configurada: ${salaId} -> Host: ${socket.id}`);
    });

    // El Invitado introduce el código y se conecta de golpe
    socket.on('unirse_sala', (salaId) => {
        if (salas[salaId]) {
            socket.join(salaId);
            salas[salaId].invitado = socket.id;
            console.log(`Invitado: ${socket.id} acoplado a la sala: ${salaId}`);
            
            // Avisamos de forma instantánea al Host que el rival ya está en la arena
            io.to(salas[salaId].host).emit('rival_conectado');
        } else {
            socket.emit('error_sala', 'ROOM PROTOCOL: NOT FOUND OR EXPIRED');
        }
    });

    // Retransmisor síncrono instantáneo (Chat, Saques, Coordenadas de paletas)
    socket.on('enviar_paquete', ({ salaId, datos }) => {
        // Redirige el paquete al rival en la misma sala en menos de 1ms
        socket.to(salaId).emit('recibir_paquete', datos);
    });

    // Evento de emergencia si se limpia la cola tras un gol
    socket.on('limpiar_sala', (salaId) => {
        socket.to(salaId).emit('recibir_paquete', { tipo: 'sync_reset_pelota' });
    });

    socket.on('disconnect', () => {
        console.log(`Dispositivo desconectado de la red: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Cerebro WebSocket operando con Socket.io en puerto ${PORT}`);
});
