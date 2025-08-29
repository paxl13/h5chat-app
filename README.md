# H5 Chat Application

A real-time chat application built with vanilla HTML5, JavaScript, and Express.js with Socket.io.

## Build Setup

- **Development**: Uses Tailwind CDN (no build required)
- **Production**: Uses PostCSS to compile and minify Tailwind CSS

## Features

- Real-time messaging with Socket.io
- Multiple chat rooms support
- User presence indicators
- Typing indicators
- Message history (last 100 messages per room)
- Responsive design
- Hot reload in development mode
- Self-hosted package (frontend served by backend)

## Installation

```bash
cd h5chat-app
npm install
```

## Running the Application

### Development Mode (with hot reload and Tailwind CDN)

```bash
npm run dev
```

### Production Mode

```bash
# Build the CSS and HTML for production
npm run build:prod

# Start the production server
npm start
```

The application will be available at `http://localhost:3000`

## Build Commands

- `npm run build:css` - Compile Tailwind CSS
- `npm run build:prod` - Full production build (CSS + HTML)
- `npm run build:html` - Generate production HTML without CDN

## Architecture

- **Frontend**: Vanilla HTML5, CSS, and JavaScript (no frameworks)
- **Backend**: Express.js with Socket.io for WebSocket communication
- **State Management**: All conversation state maintained on server
- **Hot Reload**: Available in development mode using chokidar

## File Structure

```
h5chat-app/
├── server/
│   ├── index.js         # Production server
│   └── dev-server.js    # Development server with hot reload
├── public/
│   ├── index.html       # Main HTML file
│   ├── css/
│   │   └── styles.css   # Styling
│   └── js/
│       └── chat.js      # Client-side JavaScript
├── package.json
└── README.md
```

## Deployment to Render

The app includes a `render.yaml` configuration for easy deployment to Render:

1. Push your code to a GitHub repository
2. Connect your repository to Render
3. Render will automatically:
   - Install dependencies
   - Build the production CSS
   - Start the server with NODE_ENV=production

## How It Works

1. The Express server hosts the static files and handles WebSocket connections
2. Users join rooms and all state is maintained on the server
3. Messages are broadcasted to all users in the same room
4. The server keeps the last 100 messages for each room
5. Rooms are automatically cleaned up after 5 minutes of inactivity
