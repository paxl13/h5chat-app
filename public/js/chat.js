const socket = io();

let currentUser = {
  username: '',
  room: '',
};

const loginModal = document.getElementById('loginModal');
const chatContainer = document.getElementById('chatContainer');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const roomInput = document.getElementById('roomInput');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messagesList = document.getElementById('messagesList');
const usersList = document.getElementById('usersList');
const currentRoom = document.getElementById('currentRoom');
const currentUsername = document.getElementById('currentUsername');
const leaveBtn = document.getElementById('leaveBtn');
const typingIndicator = document.getElementById('typingIndicator');

let typingTimer;
let isTyping = false;
const typingUsers = new Set();

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim() || 'general';

  if (username) {
    socket.emit('join', { username, room });
  }
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();

  if (text) {
    socket.emit('message', { text });
    messageInput.value = '';
    stopTyping();
  }
});

messageInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing', { isTyping: true });
  }

  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 1000);
});

function stopTyping() {
  if (isTyping) {
    isTyping = false;
    socket.emit('typing', { isTyping: false });
  }
  clearTimeout(typingTimer);
}

leaveBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to leave the room?')) {
    location.reload();
  }
});

socket.on('joinedRoom', (data) => {
  currentUser.username = data.username;
  currentUser.room = data.room;

  currentRoom.textContent = data.room;
  currentUsername.textContent = data.username;

  loginModal.classList.remove('active');
  chatContainer.classList.add('active');

  messagesList.innerHTML = '';

  if (data.messages && data.messages.length > 0) {
    data.messages.forEach((msg) => addMessage(msg));
  }

  addSystemMessage(`You joined the room "${data.room}" as "${data.username}"`);
});

socket.on('message', (message) => {
  addMessage(message);
});

socket.on('userJoined', (data) => {
  addSystemMessage(`${data.username} joined the room`);
});

socket.on('userLeft', (data) => {
  addSystemMessage(`${data.username} left the room`);
});

socket.on('roomUsers', (data) => {
  updateUsersList(data.users);
});

socket.on('userTyping', (data) => {
  if (data.isTyping) {
    typingUsers.add(data.username);
  } else {
    typingUsers.delete(data.username);
  }
  updateTypingIndicator();
});

function addMessage(message) {
  const messageElement = document.createElement('div');
  const isOwnMessage = message.username === currentUser.username;

  messageElement.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-slide-in`;

  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const messageBubble = `
        <div class="max-w-xs lg:max-w-md">
            <div class="flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 mb-1">
                <span class="text-xs font-semibold ${isOwnMessage ? 'text-purple-600' : 'text-gray-600'}">
                    ${escapeHtml(message.username)}
                </span>
                <span class="text-xs text-gray-400">${time}</span>
            </div>
            <div class="${
              isOwnMessage
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-800'
            } 
                px-4 py-2 rounded-2xl shadow-sm break-words">
                ${escapeHtml(message.text)}
            </div>
        </div>
    `;

  messageElement.innerHTML = messageBubble;
  messagesList.appendChild(messageElement);
  scrollToBottom();
}

function addSystemMessage(text) {
  const messageElement = document.createElement('div');
  messageElement.className = 'text-center py-2';
  messageElement.innerHTML = `<span class="text-xs text-gray-500 italic">${text}</span>`;
  messagesList.appendChild(messageElement);
  scrollToBottom();
}

function updateUsersList(users) {
  usersList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    const isCurrentUser = user.username === currentUser.username;
    li.className = `px-3 py-2 rounded-md transition-colors hover:bg-white hover:bg-opacity-10 ${
      isCurrentUser ? 'text-green-400 font-semibold' : 'text-white'
    }`;
    li.textContent = user.username;
    usersList.appendChild(li);
  });
}

function updateTypingIndicator() {
  if (typingUsers.size > 0) {
    const users = Array.from(typingUsers);
    let text = '';

    if (users.length === 1) {
      text = `${users[0]} is typing...`;
    } else if (users.length === 2) {
      text = `${users[0]} and ${users[1]} are typing...`;
    } else {
      text = `${users.length} people are typing...`;
    }

    typingIndicator.textContent = text;
    typingIndicator.classList.remove('hidden');
  } else {
    typingIndicator.classList.add('hidden');
  }
}

function scrollToBottom() {
  messagesList.scrollTop = messagesList.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
