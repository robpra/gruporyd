document.addEventListener('DOMContentLoaded', () => {
    const chatToggler = document.querySelector('.chat-toggler');
    const chatWidget = document.querySelector('.chat-widget');

    const messageInput = document.getElementById('message-input');
    const sendBtn = document.querySelector('.send-btn');
    const chatBody = document.querySelector('.chat-body');

    // Muestra u oculta la ventana del chat
    chatToggler.addEventListener('click', () => {
        chatWidget.classList.toggle('open');
        chatToggler.classList.toggle('open');
    });

    // Funcio�n para enviar mensajes
    const sendMessage = () => {
        const userMessage = messageInput.value.trim();
        if (userMessage === '') return;

        // Añade el mensaje del usuario al chat
        appendMessage(userMessage, 'user-message');
        messageInput.value = '';

        // Simula una respuesta del bot después de 1 segundo
        setTimeout(() => {
            const botResponse = getBotResponse(userMessage);
            appendMessage(botResponse, 'bot-message');
        }, 1000);
    };

    // Event listeners para enviar mensajes
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // Función para añadir mensajes al cuerpo del chat
    function appendMessage(message, className) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', className);
        const messageP = document.createElement('p');
        messageP.textContent = message;
        messageDiv.appendChild(messageP);
        chatBody.appendChild(messageDiv);

        // Desplaza hacia el último mensaje
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // Lógica simple para respuestas del bot
    function getBotResponse(userInput) {
        const input = userInput.toLowerCase();
        if (input.includes('hola')) {
            return '¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?';
        } else if (input.includes('precio') || input.includes('costo')) {
            return 'Para información sobre precios, por favor visita nuestra página de productos.';
        } else if (input.includes('gracias')) {
            return '¡De nada! Estamos para servirte.';
        } else {
            return 'No estoy seguro de cómo responder a eso. Intenta preguntarme sobre precios o simplemente saluda.';
        }
    }
});