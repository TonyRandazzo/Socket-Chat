var socket = io();
var messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');
var currentUsername = '';
var currentRoom = '';
const usernameLogin = document.cookie.replace(/(?:(?:^|.*;\s*)username\s*=\s*([^;]*).*$)|^.*$/, "$1");
const passwordLogin = document.cookie.replace(/(?:(?:^|.*;\s*)password\s*=\s*([^;]*).*$)|^.*$/, "$1")
socket.emit('authenticate', { username: usernameLogin, password: passwordLogin });
socket.on('authenticated', (authUsername) => {
    document.cookie = `username=${authUsername}; path=/;`;
    document.cookie = `password=${passwordLogin}; path=/;`;
    currentUsername = authUsername;
    socket.emit('load messages', currentRoom);
});

form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (input.value) {
        var msgData = { msg: input.value, userId: currentUsername, room: currentRoom };
        socket.emit('chat message', msgData);
        input.value = '';
    }
});

socket.on("chat message", function (msgData) {
    appendMessage(msgData);
    if (msgData.userId !== currentUsername) {
        showNotification(`${msgData.userId}: ${msgData.msg}`);
    }
});

function appendMessage(msgData) {
    var item = document.createElement('li');

    if (msgData.userId !== 'system') {
        var userLabel = document.createElement('span');
        userLabel.textContent = msgData.userId;
        userLabel.classList.add('user-label');
        item.appendChild(userLabel);
    }

    var messageText = document.createElement('span');
    messageText.textContent = msgData.msg;
    item.appendChild(messageText);

    if (msgData.userId === 'system') {
        item.classList.add('system');
    } else if (msgData.userId === currentUsername) {
        item.classList.add('bg-green-600', 'user');
    } else {
        item.classList.add('bg-gray-600', 'rounded-2xl');
    }
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}

function loadUsers() {
    fetch('/get-users')
        .then(response => response.json())
        .then(users => {
            const userList = document.getElementById('online-users');
            userList.innerHTML = '';
            users.forEach(user => {
                const listItem = document.createElement('li');
                listItem.classList.add('my-2');

                const userButton = document.createElement('button');
                userButton.classList.add('chat-button', 'bg-white', 'shadow-sm', 'hover:shadow-md');
                userButton.addEventListener('click', () => openChat(user.id, user.username));

                const userImage = document.createElement('img');
                userImage.src = user.profile_image || 'default_profile_image.jpg';
                userImage.classList.add('w-10', 'h-10', 'rounded-full');

                const chatInfo = document.createElement('div');
                chatInfo.classList.add('chat-info');

                const username = document.createElement('span');
                username.textContent = user.username;
                username.classList.add('username');

                const lastMessage = document.createElement('span');
                lastMessage.textContent = 'Ultimo messaggio...';
                lastMessage.classList.add('last-message');

                chatInfo.appendChild(username);
                chatInfo.appendChild(lastMessage);
                userButton.appendChild(userImage);
                userButton.appendChild(chatInfo);
                listItem.appendChild(userButton);
                userList.appendChild(listItem);
            });
        })
        .catch(error => console.error('Errore nel caricamento degli utenti:', error));
}

function getUserIdFromCookie() {
    const cookie = document.cookie;
    const cookieArray = cookie.split('; ');
    for (let i = 0; i < cookieArray.length; i++) {
        const cookieItem = cookieArray[i].split('=');
        if (cookieItem[0] === 'user_id') {
            return cookieItem[1];
        }
    }
    return null;
}

function openChat(userId, username) {
    const currentUserId = getUserIdFromCookie();
    if (userId === currentUserId) {
        console.log('Hai cliccato sul tuo stesso utente');
    } else {
        console.log(`Apri chat con l'utente ${username}`);
        currentRoom = [currentUsername, username].sort().join('-');
        socket.emit('join private chat', { room: currentRoom, userId });
        clearMessages();
        loadRoomMessages(currentRoom);
    }
}

function showNotification(message) {
    if (!("Notification" in window)) {
        console.log("Questo browser non supporta le notifiche desktop");
    } else if (Notification.permission === "granted") {
        new Notification("Nuovo messaggio", {
            body: message,
        });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                new Notification("Nuovo messaggio", {
                    body: message,
                });
            }
        });
    }
}

function clearMessages() {
    messages.innerHTML = '';
}

function loadRoomMessages(room) {
    socket.emit('load messages', room);
}

socket.on('load messages', function (msgData) {
    appendMessage(msgData);
});

window.addEventListener('load', loadUsers);