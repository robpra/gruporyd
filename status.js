const container = document.getElementById("agentes-container");

let allAgentes = [];

async function fetchAgentes() {
  try {
    const res = await fetch("https://pbx.ryd/api/ari/agentes000.php?_=" + Date.now()); // evitar caché
    const data = await res.json();
    allAgentes = data;
    renderAgentes(data);
  } catch (err) {
    console.error("Error al obtener agentes:", err);
  }
}

function renderAgentes(agentes) {
  container.innerHTML = "";
  agentes.forEach(ag => {
    const card = document.createElement("div");
    card.classList.add("card");

    // Obtener el estado del canal si existe
    let channelState = ag.channel && ag.channel.state ? ag.channel.state.toLowerCase() : null;
    let baseState = ag.state ? ag.state.toLowerCase() : "offline";

    // Determinar estado final
    let finalState = channelState || baseState;

    let stateClass = "offline";
    let stateText = "Desconectado";

    switch (finalState) {
      case "up":
        stateClass = "busy";
        stateText = "En llamada";
        break;
      case "ringing":
        stateClass = "ringing";
        stateText = "Timbrando";
        break;
      case "dialing":
        stateClass = "ringing";
        stateText = "Marcando";
        break;
      case "online":
        stateClass = "online";
        stateText = "Disponible";
        break;
      case "busy":
        stateClass = "busy";
        stateText = "Ocupado";
        break;
      default:
        stateClass = "offline";
        stateText = "Desconectado";
    }

    // Mostrar "Hablando con" solo si está en llamada (no ringing)
    let talkingWith = "";
    if (finalState === "up" && ag.channel && ag.channel.connected && ag.channel.connected.number) {
      talkingWith = `Hablando con: ${ag.channel.connected.name || ag.channel.connected.number}`;
    }

    card.classList.add(`card-${stateClass}`);

    card.innerHTML = `
      <div class="agent-name">${ag.name}</div>
      <div class="agent-number">Ext: ${ag.number}</div>
      <div class="agent-state">${stateText}</div>
      <div class="talking-with">${talkingWith}</div>
    `;

    container.appendChild(card);
  });
}


fetchAgentes();
setInterval(fetchAgentes, 3000);

  