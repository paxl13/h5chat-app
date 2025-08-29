const socket = io();

let currentUser = {
  username: '',
  room: '',
};

// DOM Elements
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

// Mobile Elements
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const mobileUserCount = document.getElementById('mobileUserCount');

let typingTimer;
let isTyping = false;
const typingUsers = new Set();
let onlineUsersCount = 0;

// Mobile Sidebar Functions
function openSidebar() {
  sidebar.classList.add('sidebar-open');
  sidebarOverlay.classList.remove('hidden');
  document.body.classList.add('sidebar-open');
}

function closeSidebar() {
  sidebar.classList.remove('sidebar-open');
  sidebarOverlay.classList.add('hidden');
  document.body.classList.remove('sidebar-open');
}

// Mobile Menu Event Listeners
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', openSidebar);
}

if (closeSidebarBtn) {
  closeSidebarBtn.addEventListener('click', closeSidebar);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeSidebar);
}

// Form Event Listeners
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
    
    // Focus back on input for mobile
    messageInput.focus();
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

// Prevent zoom on mobile when focusing input
messageInput.addEventListener('touchstart', (e) => {
  e.target.style.fontSize = '16px';
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

// Socket Event Handlers
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
  
  // Focus message input on join
  setTimeout(() => {
    messageInput.focus();
  }, 100);
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

// UI Functions
function addMessage(message) {
  const messageElement = document.createElement('div');
  const isOwnMessage = message.username === currentUser.username;

  messageElement.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-slide-in`;

  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const messageBubble = `
    <div class="max-w-[85%] sm:max-w-xs lg:max-w-md">
      <div class="flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-1 sm:gap-2 mb-1">
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
        px-3 sm:px-4 py-2 rounded-2xl shadow-sm break-words text-sm sm:text-base">
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
  onlineUsersCount = users.length;
  
  // Update mobile user count
  if (mobileUserCount) {
    mobileUserCount.querySelector('span').textContent = onlineUsersCount;
  }
  
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

// Handle viewport resize and orientation change
function handleResize() {
  // Close sidebar on desktop view
  if (window.innerWidth >= 1024) {
    closeSidebar();
  }
  
  // Adjust viewport height for mobile browsers
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Visual Viewport API for handling keyboard on Android
function handleVisualViewport() {
  if (!window.visualViewport) {
    return;
  }
  
  const viewport = window.visualViewport;
  const threshold = 150; // Keyboard is likely open if viewport shrinks by more than this
  
  function updateViewport() {
    const hasKeyboard = window.innerHeight - viewport.height > threshold;
    const keyboardHeight = hasKeyboard ? window.innerHeight - viewport.height : 0;
    
    document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
    
    if (hasKeyboard) {
      document.body.classList.add('keyboard-open');
      
      // Scroll message container to bottom when keyboard opens
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } else {
      document.body.classList.remove('keyboard-open');
    }
    
    // Update chat main height
    const chatMain = document.getElementById('chatMain');
    if (chatMain && window.innerWidth <= 1024) {
      if (hasKeyboard) {
        chatMain.style.height = `${viewport.height}px`;
      } else {
        chatMain.style.height = '';
      }
    }
  }
  
  viewport.addEventListener('resize', updateViewport);
  viewport.addEventListener('scroll', updateViewport);
  
  // Initial check
  updateViewport();
}

// Fallback for browsers without Visual Viewport API
function handleInputFocus() {
  const inputs = [messageInput, usernameInput, roomInput];
  
  inputs.forEach(input => {
    if (!input) return;
    
    input.addEventListener('focus', () => {
      if (window.innerWidth <= 1024) {
        // Estimate keyboard height (usually 40% of screen on mobile)
        setTimeout(() => {
          const estimatedKeyboardHeight = window.innerHeight * 0.4;
          document.documentElement.style.setProperty('--keyboard-height', `${estimatedKeyboardHeight}px`);
          document.body.classList.add('keyboard-open');
          scrollToBottom();
        }, 300);
      }
    });
    
    input.addEventListener('blur', () => {
      setTimeout(() => {
        document.documentElement.style.setProperty('--keyboard-height', '0px');
        document.body.classList.remove('keyboard-open');
      }, 100);
    });
  });
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

// Initialize viewport handling
handleResize();
handleVisualViewport();

// Fallback for older browsers
if (!window.visualViewport) {
  handleInputFocus();
}