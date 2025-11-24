console.log("¿ Cargando SignalR Client...");

//const SIGNALR_URL = "https://pbx.ryd/gruporyd/ws/events";
SIGNALR_URL ="https://pbx.ryd:5001/eventsHub";

let connection = null;
let isConnected = false;

async function startSignalR() {
    console.log("¿ startSignalR inicializando...");

    connection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_URL, {
            transport: signalR.HttpTransportType.WebSockets,
            skipNegotiation: false
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

    registerEvents();

    try {
        console.log("¿ Conectando al Hub...");
        await connection.start();

        isConnected = true;
        console.log("¿ Conectado:", connection.connectionId);

        await joinGroup("prelogin");
    } catch (err) {
        console.error("¿ Error de conexión", err);
        setTimeout(startSignalR, 3000);
    }
}

function registerEvents() {

    connection.on("provisioning", async payload => {
        console.log("¿ PROVISIONING RECIBIDO:", payload);

        if (!payload || !payload.idUsuario) {
            console.error("¿ provisioning inválido");
            return;
        }

        // 1) HANDSHAKE ¿ mueve este navegador al grupo user_idUsuario
        try {
            await connection.invoke("Handshake", payload.idUsuario);
            console.log(`¿ Handshake OK para idUsuario=${payload.idUsuario}`);
        } catch (e) {
            console.error("¿ Error en Handshake:", e);
        }

        // 2) Guardar credenciales para el softphone
        window.phoneOptions = payload;

        // 3) Crear/recrear UserAgent del softphone
        if (window.RecreateUserAgent)
            window.RecreateUserAgent(payload);
    });

    connection.onreconnecting(() => {
        console.warn("¿ Reconnecting...");
        isConnected = false;
    });

    connection.onreconnected(connId => {
        console.log("¿ Reconnected:", connId);
        isConnected = true;
        joinGroup("prelogin");
    });

    connection.onclose(() => {
        console.warn("¿ Conexión cerrada, reintentando...");
        isConnected = false;
        setTimeout(startSignalR, 2000);
    });
}

async function joinGroup(name) {
    if (!connection || connection.state !== "Connected") return;

    try {
        await connection.invoke("JoinGroup", name);
        console.log(`¿ Unido al grupo ${name}`);
    } catch (err) {
        console.error(`¿ Error joinGroup(${name})`, err);
    }
}

window.startSignalR = startSignalR;

console.log("¿ SignalR Client listo.");

