# AlienWaste Telegram Web App

A Telegram Web App integration for the AlienWaste eco-gaming platform. Feed your alien companion by scanning waste and help save the planet! 🌍👽

## Features

- 🎮 **Interactive Gameplay**: Scan waste, feed your alien, earn points
- 👽 **Dynamic Alien Character**: Visual changes based on hunger and level
- 🏆 **Gamification**: Daily missions, achievements, leaderboards
- 📱 **Telegram Integration**: Native Web App experience
- 🔐 **Secure Authentication**: Telegram user verification
- 📊 **Real-time Stats**: Live progress tracking

## Quick Start

### Prerequisites

- Node.js 16+ installed
- Telegram Bot Token (from @BotFather)
- ngrok for local development tunneling

### 1. Setup Bot

1. Create a new bot with [@BotFather](https://t.me/BotFather)
2. Get your bot token
3. Set bot commands:
   ```
   start - Launch AlienWaste game
   help - Show help information
   stats - View your statistics
   ```

### 2. Local Development

```bash
# Clone and setup
git clone <your-repo>
cd telegram-webapp

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your bot token and URLs

# Start development server
npm run dev

# In another terminal, start ngrok tunnel
npx ngrok http 3000
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### 3. Configure Environment

Edit `.env` file:
```env
BOT_TOKEN=your_bot_token_from_botfather
WEB_APP_URL=https://abc123.ngrok.io
WEBHOOK_URL=https://abc123.ngrok.io/webhook
DOMAIN=abc123.ngrok.io
PORT=3000
NODE_ENV=development
```

### 4. Setup Web App in Telegram

1. Go to [@BotFather](https://t.me/BotFather)
2. Send `/setmenubutton`
3. Select your bot
4. Send button text: `🚀 Play AlienWaste`
5. Send Web App URL: `https://abc123.ngrok.io/webapp`

### 5. Test the App

1. Start your bot in Telegram
2. Send `/start` command
3. Click "🚀 Launch AlienWaste" button
4. Enjoy the game!

## Project Structure

```
telegram-webapp/
├── index.js              # Main server file
├── package.json          # Dependencies
├── .env.example          # Environment template
├── README.md            # This file
└── public/              # Frontend files
    ├── index.html       # Main HTML
    ├── styles.css       # Styling
    └── app.js          # Frontend JavaScript
```

## API Endpoints

### Authentication
- `POST /api/auth` - Authenticate Telegram user

### Game Actions
- `POST /api/scan-waste` - Scan waste and feed alien
- `POST /api/complete-mission` - Complete daily mission
- `GET /api/leaderboard` - Get global leaderboard

### Web App
- `GET /webapp` - Serve the Web App interface
- `POST /webhook` - Telegram webhook endpoint

## Deployment

### Heroku Deployment

1. Create Heroku app:
   ```bash
   heroku create your-app-name
   ```

2. Set environment variables:
   ```bash
   heroku config:set BOT_TOKEN=your_bot_token
   heroku config:set WEB_APP_URL=https://your-app-name.herokuapp.com
   heroku config:set WEBHOOK_URL=https://your-app-name.herokuapp.com/webhook
   heroku config:set DOMAIN=your-app-name.herokuapp.com
   heroku config:set NODE_ENV=production
   ```

3. Deploy:
   ```bash
   git push heroku main
   ```

4. Update bot settings with production URL

### Railway Deployment

1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### VPS Deployment

1. Setup Node.js on your server
2. Clone repository
3. Install dependencies: `npm install`
4. Setup environment variables
5. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start index.js --name alienwaste-webapp
   pm2 startup
   pm2 save
   ```

## Development

### Adding New Features

1. **Backend API**: Add routes in `index.js`
2. **Frontend**: Update `public/app.js` and `public/index.html`
3. **Styling**: Modify `public/styles.css`

### Game State Management

Game state is currently stored in memory. For production, consider:
- Redis for session storage
- PostgreSQL for persistent data
- MongoDB for flexible document storage

### Testing

```bash
# Run server
npm start

# Test endpoints
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"initData":"test_data"}'
```

## Telegram Web App SDK

The app uses Telegram's Web App SDK for:
- User authentication via `initData`
- Native UI integration (MainButton, HapticFeedback)
- Theme adaptation
- Viewport management

### Key SDK Methods Used

```javascript
// Initialize
Telegram.WebApp.ready()
Telegram.WebApp.expand()

// UI
Telegram.WebApp.MainButton.show()
Telegram.WebApp.setHeaderColor('#000000')

// Feedback
Telegram.WebApp.HapticFeedback.impactOccurred('medium')
Telegram.WebApp.showAlert('Message')
```

## Security

- ✅ Telegram initData verification
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation
- ✅ Rate limiting (recommended for production)

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check bot token
   - Verify webhook URL is accessible
   - Check server logs

2. **Web App not loading**
   - Ensure HTTPS URL (required by Telegram)
   - Check CORS settings
   - Verify Web App URL in BotFather

3. **Authentication failing**
   - Verify initData validation
   - Check bot token in verification

### Debug Mode

Set `NODE_ENV=development` for detailed logging.

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📧 Email: support@alienwaste.com
- 💬 Telegram: @alienwaste_support
- 🐛 Issues: GitHub Issues page

---

**Happy eco-gaming! 🌱👽**