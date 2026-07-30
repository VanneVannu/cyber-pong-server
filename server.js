const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors());

// Creamos el servidor HTTP básico de Express
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Servidor HTTP y WebSocket corriendo en el puerto ${PORT}`);
});

// Acoplamos el servidor de WebSockets puros directamente sobre el puerto HTTP
const wss = new WebSocketServer({ server });

// Diccionario en memoria para agrupar las conexiones por sala
const salas = {};

wss.on('connection', (ws) => {
    console.log('[NET]: Nueva terminal acoplada al canal de vectores.');

    ws.on('message', (message) => {
        try {
            const paquete = JSON.parse(message);
            const { accion, salaId, contenido } = paquete;

            // 1. PROTOCOLO DE CREACIÓN DE SALA (HOST)
            if (accion === 'crear_sala') {
                ws.salaId = salaId;
                ws.esHost = true;
                salas[salaId] = { host: ws, invitado: null };
                console.log(`[ROOM]: Sala reservada: ${salaId}`);
            }

            // 2. PROTOCOLO DE CONEXIÓN DE RIVAL (INVITADO)
            if (accion === 'unirse_sala') {
                if (salas[salaId]) {
                    ws.salaId = salaId;
                    ws.esHost = false;
                    salas[salaId].invitado = ws;
                    console.log(`[ROOM]: Invitado acoplado con éxito a la sala: ${salaId}`);
                    
                    // Le avisamos inmediatamente al Host de forma interna que el rival ya entró
                    if (salas[salaId].host && salas[salaId].host.readyState === 1) {
                        salas[salaId].host.send(JSON.stringify({ tipo: 'rival_conectado' }));
                    }
                } else {
                    ws.send(JSON.stringify({ tipo: 'error_sala', mensaje: 'SALA_NO_ENCONTRADA' }));
                }
            }

            // 3. RETRANSMISOR UNIVERSAL ULTRA VELOZ (Chat, Goles, Sincronización)
            if (accion === 'transmitir') {
                const sala = salas[ws.salaId];
                if (sala) {
                    // Si eres el host, se lo mandas al invitado; si eres invitado, se lo mandas al host
                    const destino = ws.esHost ? sala.invitado : sala.host;
                    if (destino && destino.readyState === 1) {
                        destino.send(JSON.stringify(contenido));
                    }
                }
            }

        } catch (e) {
            console.error("Error al procesar JSON aéreo:", e);
        }
    });

    ws.on('close', () => {
        if (ws.salaId && salas[ws.salaId]) {
            console.log(`[NET]: Terminal desconectada de la sala: ${ws.salaId}`);
            delete salas[ws.salaId]; // Limpieza de memoria instantánea
        }
    });
});
