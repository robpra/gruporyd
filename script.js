document.addEventListener('DOMContentLoaded', () => {
    const chatToggler = document.querySelector('.chat-toggler');
    const chatWidget = document.querySelector('.chat-widget');
    const chatBody = document.querySelector('.chat-body');
    // Muestra u oculta la ventana del chat
    chatToggler.addEventListener('click', () => {
        chatWidget.classList.toggle('open');
        chatToggler.classList.toggle('open');
    });

});