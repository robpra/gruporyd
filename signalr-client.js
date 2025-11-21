/******************************************************************
 * SIGNALR CLIENT – VoiceAPI (versión final y estable)
 ******************************************************************/

console.log("📡 Cargando SignalR Client...");

const SIGNALR_URL = "https://pbx.ryd:5001/eventsHub";

let signalRConnection = null;
let joiningGroups = false;

/******************************************************************
 * Crear conexión SignalR con reconexión automática
 ******************************************************************/
async function createSignalRConnection() {
    try {
        if (signalRConnection) {
            console.warn("🛑 Cortando conexión previa...");
            await signalRConnection.stop();
        }
    } catch (e) {
        console.error("Error al detener conexión previa:", e);
    }

    console.warn("🔌 Iniciando nueva conexión SignalR...");

    signalRConnection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_URL, {
            transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect({
            nextRetryDelayInMilliseconds: retryCtx => {
                const delays = [0, 2000, 5000, 10000];
                return delays[retryCtx.previousRetryCount] || 10000;
            }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

    /**************************************************************
     * EVENT HANDLERS
     **************************************************************/

    signalRConnection.on("agentLogin", data => {
        console.log("📥 EVENT: agentLogin", data);
	procesarProvision(data);
        Unregister();


    });

    signalRConnection.on("agentReLogin", data => {
        console.log("📥 EVENT: agentReLogin", data);
    });

    signalRConnection.onreconnecting(() => {
        console.warn("🟡 SignalR intentando reconectar...");
    });

    signalRConnection.onreconnected(async () => {
        console.warn("🟢 SignalR reconectado exitosamente.");
        await joinGroups();
    });

    signalRConnection.onclose(() => {
        console.warn("🔴 SignalR cerrado.");
    });

    /**************************************************************
     * INICIAR CONEXIÓN
     **************************************************************/
    try {
        await signalRConnection.start();
        console.warn("🟢 SignalR CONECTADO a:", SIGNALR_URL);

        await joinGroups();
    } catch (err) {
        console.error("❌ Error al conectar SignalR:", err);
        setTimeout(createSignalRConnection, 4000);
    }
}

/******************************************************************
 * ÚNETE A GRUPOS SEGÚN EL PROVISIONING DISPONIBLE
 ******************************************************************/
async function joinGroups() {
    if (!signalRConnection || signalRConnection.state !== "Connected") {
        console.warn("⚠ No se puede unir a grupos: conexión no está activa");
        return;
    }

    if (joiningGroups) return;
    joiningGroups = true;

    try {
        console.log("📌 JoinGroup → prelogin");
        await signalRConnection.invoke("JoinGroup", "prelogin");

        if (window.provision?.agente) {
            const grp = `agente:${window.provision.agente}`;
            console.log(`📌 JoinGroup → ${grp}`);
            await signalRConnection.invoke("JoinGroup", grp);
        }

        console.log("📌 Grupos unidos correctamente");
    } catch (e) {
        console.error("❌ Error uniendo a grupos:", e);
    }

    joiningGroups = false;
}

/******************************************************************
 * Inicializar SignalR (se llama UNA sola vez)
 ******************************************************************/
async function initSignalR() {
    await createSignalRConnection();
}

/******************************************************************
 * Esto debe llamarse inmediatamente después del LOGIN exitoso.
 ******************************************************************/
async function startProvisioning(provisioningData) {
    console.log("⚙️ Recibiendo provisioning:", provisioningData);

    window.provision = provisioningData;

    if (!signalRConnection) {
        await initSignalR();
    }

    await joinGroups();
}

/******************************************************************
 * Exponer funciones globales
 ******************************************************************/
window.SignalRClient = {
    init: initSignalR,
    startProvisioning: startProvisioning,
    connection: () => signalRConnection
};


// =============================
//   PROVISIONAR PHONE OPTIONS
// =============================

function procesarProvision(cfg) {
    console.log("--> Procesando datos de provisioning...");

    window.provision = cfg;

    // Variables del softphone
    phoneOptions.profileName     = cfg.usuario;
    phoneOptions.idAgent         = cfg.agente;
    phoneOptions.idUsuario       = cfg.idUsuario;
    phoneOptions.idQueue         = cfg.servicio;
    phoneOptions.QueuePri        = cfg.prioridad;
    phoneOptions.rolCRM          = cfg.rol;

    // SIP
    phoneOptions.SipUsername     = cfg.extension;
    phoneOptions.SipPassword     = cfg.SipPassword || `${cfg.extension}PSW`;
    phoneOptions.SipDomain       = window.provision.sipDomain;
    phoneOptions.RegisterExpires = 3600;

    // WSS
    phoneOptions.wssServer       = cfg.wssServer;
    phoneOptions.WebSocketPort   = cfg.wssPort || "8089";
    phoneOptions.ServerPath      = "/ws";

   localDB.setItem("wssServer",cfg.wssServer);
   localDB.setItem("WebSocketPort",cfg.wssPort);
   localDB.setItem("ServerPath", '/ws');
   localDB.setItem("SipDomain", cfg.sipDomain);
   localDB.setItem("profileName", cfg.usuario);

   localDB.setItem("idAgent",cfg.agente);
   localDB.setItem("idQueue",cfg.servicio);
   localDB.setItem("SipUsername",cfg.extension);
   localDB.setItem("SipPassword",cfg.extension+'PSW');
   localDB.setItem("idUsuario",cfg.idUsuario);

    ShowMyProfile();
    console.log("phoneOptions:", phoneOptions);

    if (rolCRM === "agente") {
        if (typeof window.RecreateUserAgent === "function") {
            console.log("--> Ejecutando RecreateUserAgent()...");
            window.RecreateUserAgent();
	        addQueueMember();
        }
    }
// =============================
//   AGREGAR AGENTE AL SERVICIO
// =============================
async function addQueueMember() {
    try {
        const params = new URLSearchParams();
        params.append("queue", phoneOptions.idQueue);
        params.append("penalty", phoneOptions.QueuePri);
        params.append("member", "SIP/" + phoneOptions.SipUsername);

        const response = await fetch("http://pbx.ryd/gruporyd/api/queueAdd.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString()
        });

        const data = await response.json();
        console.log("CMD ejecutado:", data.cmd);
        console.log("Salida Asterisk:", data.output);

    } catch (error) {
        console.error("Error:", error);
    }
}


console.log("📡 SignalR Client listo.");

