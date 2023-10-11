window.onload = () => {
    const conversationsElement = document.getElementById('conversations');

    // Store the previous conversations
    let previousConversations = {};

    function updateConversationGrid() {
        fetch('https://api.stephyaz.com/conversations')
            .then(response => response.json())
            .then(data => {
                // Go through each conversation
                Object.entries(data).forEach(([key, messages]) => {
                    // Check if this conversation already exists
                    let convoDiv = document.getElementById(`conversation_${key}`);
                    
                    // If it doesn't exist, create it
                    if (!convoDiv) {
                        convoDiv = document.createElement('div');
                        convoDiv.id = `conversation_${key}`;
                        convoDiv.className = 'conversation';
                        convoDiv.innerHTML = `<h2>Conversation ${key}</h2>`;
                        conversationsElement.appendChild(convoDiv);
                        
                        previousConversations[key] = "";
                    }

                    // If messages have changed, update the conversation
                    if (messages != previousConversations[key]) {
                        const newMessages = messages.split('/split/');
                        const oldMessageCount = convoDiv.getElementsByClassName('message').length;

                        // Add only new messages
                        for (let i = oldMessageCount; i < newMessages.length; i++) {
                            const messageDiv = document.createElement('div');
                            messageDiv.className = 'message';
                            messageDiv.textContent = newMessages[i];
                            convoDiv.appendChild(messageDiv);
                        }
                        
                        convoDiv.classList.add('updated');

                        // Remove the updated class after two seconds
                        setTimeout(() => {
                            convoDiv.classList.remove('updated')
                        }, 2000);
                        
                        previousConversations[key] = messages;
                    }
                });
            });
    }

    // Update every 500ms
    setInterval(updateConversationGrid, 500);
}