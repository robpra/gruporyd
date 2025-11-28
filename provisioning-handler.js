console.log("?? Cargando provisioning-handler.js...");

window.HandleProvisioning = function (data) {
    console.log("?? provisioningLogin recibido:", data);

    if (!data) {
        console.error("? provisioningLogin vino vacío!");
        return;
    }

    // ======================================================
    // 1) VARIABLES RECIBIDAS DEL SERVIDOR
    // ======================================================

    const {
        usuario,
        idUsuario,
        idAgente,
        idServicio,
        extension,
        rol,
        cliente,
        jwt,
        pbx
    } = data;

    console.log("?? Datos procesados:", {
        usuario,
        idUsuario,
        idAgente,
        idServicio,
        extension,
        rol,
        cliente,
        pbx
    });

    // ======================================================
    // 2) ACTUALIZAR phoneOptions (GLOBAL EN phone.js)
    // ======================================================

    // Agente ? interno dinámico (lo asigna PBX o VoiceAPI)
    // Administrativo ? interno fijo (viene en "extension")
    const finalExtension = (rol === "administrativo")
        ? extension
        : extension && extension !== "" ? extension : "";

    phoneOptions.Usuario = usuario;
    phoneOptions.IdUsuario = idUsuario;
    phoneOptions.IdAgente = idAgente;
    phoneOptions.IdServicio = idServicio;
    phoneOptions.Extension = finalExtension;
    phoneOptions.Rol = rol;
    phoneOptions.Cliente = cliente;

    phoneOptions.Jwt = jwt;

    // Datos para SIP / WebRTC
    if (pbx) {
        phoneOptions.SipDomain = pbx.host;
        phoneOptions.WssPort = pbx.wssPort;
        phoneOptions.AriPort = pbx.ariPort;
    }

    console.log("?? phoneOptions actualizado:", phoneOptions);

    // ======================================================
    // 3) RECREAR USER AGENT (PHONE.JS)
    // ======================================================
    try {
        console.log("?? Ejecutando RecreateUserAgent()...");
        if (typeof window.RecreateUserAgent === "function") {
            window.RecreateUserAgent();
        } else {
            console.error("? RecreateUserAgent() no existe en phone.js");
        }
    } catch (err) {
        console.error("? Error ejecutando RecreateUserAgent:", err);
    }
};
