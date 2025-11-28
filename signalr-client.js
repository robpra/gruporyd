/* ============================================================
   SIGNALR CLIENT – Versión Limpia + Join Automático de Agente
   ============================================================ */

console.log("📡 Cargando SignalR Client...");

let connection = null;
let instanceId = null;

/* ============================================================
   GENERAR INSTANCE ID ÚNICO PARA CADA PESTAÑA
   ============================================================ */
function generateInstanceId() {
    const ms = Date.now();
    const rnd = Math.floor(Math.random() * 999999);
    return `${ms}-${rnd}`;
}

/* ============================================================
   INICIAR CONEXIÓN
   ============================================================ */
async function StartSignalR() {

    console.log("---- Inicializando SignalR ----");

    instanceId = generateInstanceId();

    console.log("Instance ID:", instanceId);

    const baseUrl = `${window.location.protocol}//${window.location.host}/gruporyd`;

    connection = new signalR.HubConnectionBuilder()
        .withUrl(`${baseUrl}/eventsHub?instanceId=${instanceId}`)
        .configureLogging(signalR.LogLevel.Information)
        .build();

    console.log("Conectando a:", `${baseUrl}/eventsHub`);

    try {
        await connection.start();
        console.log("✓ SignalR conectado:", connection.connectionId);

        // ====================================================
        // UNIRSE AL GRUPO CORRECTO
        // ====================================================
        const idAgente = localStorage.getItem("idAgente");

        if (idAgente && idAgente !== "" && idAgente !== "null") {
            await connection.invoke("JoinGroup", `AGENTE_${idAgente}`);
            console.log(`→ JoinGroup directo: AGENTE_${idAgente}`);
        } else {
            await connection.invoke("JoinGroup", "prelogin");
            console.log("→ JoinGroup en modo prelogin");
        }

    } catch (err) {
        console.error("❌ Error al conectar con SignalR:", err);
        console.log("Intentando reconectar en 2 segundos...");
        setTimeout(StartSignalR, 2000);
        return;
    }

    RegisterHandlers();
}

/* ============================================================
   RECONEXIÓN AUTOMÁTICA
   ============================================================ */
function RegisterHandlers() {

    // ---------------------------------------------------------
    // Reconexion
    // ---------------------------------------------------------
    connection.onclose(async () => {
        console.warn("⚠ Conexión perdida. Reintentando...");
        setTimeout(StartSignalR, 2000);
    });

    // ---------------------------------------------------------
    // HANDLER: PROVISIONING
    // ---------------------------------------------------------
    connection.on("provision", (data) => {
        console.log("📨 Evento provisioning recibido:", data);

        if (!data) {
            console.error("❌ provisioning vacío");
            return;
        }

        // Guardar agente para que la próxima recarga conecte directo al grupo AGENTE_xxx
        if (data.idAgente) {
            localStorage.setItem("idAgente", data.idAgente);
        }

        if (window.RecreateUserAgent) {
            window.RecreateUserAgent(data);
        } else {
            console.error("⚠ RecreateUserAgent no está definido");
        }
    });

    // ---------------------------------------------------------
    // HANDLER: EVENTOS DE LLAMADAS
    // ---------------------------------------------------------
    connection.on("call.event", (event) => {
        console.log("📞 Evento de llamada recibido:", event);
        if (window.OnCallEvent) {
            window.OnCallEvent(event);
        }
    });

    // ---------------------------------------------------------
    // HANDLER: EVENTOS DE AGENTE
    // ---------------------------------------------------------
    connection.on("agent.event", (event) => {
        console.log("👤 Evento de agente recibido:", event);
        if (window.OnAgentEvent) {
            window.OnAgentEvent(event);
        }
    });
}

/* ============================================================
   AUTO-INICIAR
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    console.log("📡 Iniciando SignalR desde signalr-client.js…");
    StartSignalR();
});

