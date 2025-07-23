const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Simple alien generation functions (simplified version for Node.js)
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateAlienSeed(userId) {
  return `alien_${userId}_${hashString(userId.toString())}`;
}

function generateAlienAttributes(userSeed) {
  const colorPalettes = [
    { primary: '#8A2BE2', secondary: '#9932CC', glow: '#DA70D6' },
    { primary: '#0080FF', secondary: '#1E90FF', glow: '#87CEEB' },
    { primary: '#00FF41', secondary: '#32CD32', glow: '#90EE90' },
    { primary: '#FF6B00', secondary: '#FF8C00', glow: '#FFB347' },
    { primary: '#FF1493', secondary: '#FF69B4', glow: '#FFB6C1' },
  ];
  
  const hash = hashString(userSeed);
  const colorIndex = hash % colorPalettes.length;
  
  return {
    bodyShape: 'circle',
    bodySize: 100,
    primaryColor: colorPalettes[colorIndex].primary,
    secondaryColor: colorPalettes[colorIndex].secondary,
    glowColor: colorPalettes[colorIndex].glow,
    eyeType: 'round',
    eyeColor: '#0080FF',
    eyeCount: 2,
    mouthType: 'oval',
    mouthColor: '#00FF41',
    accessories: [],
    pattern: 'none',
    antennaType: 'none',
    skinTexture: 'smooth',
  };
}

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Telegram Web App
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// AlienWaste Game State (In-memory for MVP)
const gameStates = new Map();

// Telegram Web App Authentication
function verifyTelegramWebAppData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return calculatedHash === hash;
}

// Initialize user game state
function initializeGameState(userId) {
  if (!gameStates.has(userId)) {
    const alienSeed = generateAlienSeed(userId);
    const alienAttributes = generateAlienAttributes(alienSeed);
    
    gameStates.set(userId, {
      alienLevel: 1,
      ecoPoints: 0,
      hungerLevel: 50,
      totalScans: 0,
      accuracy: 100,
      streakDays: 0,
      alienSeed,
      alienAttributes,
      dailyMissionProgress: 0,
      dailyMissionTarget: 5,
      dailyMissionCompleted: false,
      lastScanLocation: null,
      lastScanTimestamp: null,
      scansToday: 0,
      lastScanDate: null,
      achievements: [
        { id: 1, title: 'FIRST_SCAN', description: 'Complete your first waste scan', unlocked: false, icon: '🎯' },
        { id: 2, title: 'PLASTIC_HUNTER', description: 'Scan 50 plastic items', unlocked: false, icon: '♻️' },
        { id: 3, title: 'ECO_WARRIOR', description: 'Reach 1000 eco points', unlocked: false, icon: '⚡' },
      ],
      recentActivity: [],
      lastActive: new Date()
    });
  }
  return gameStates.get(userId);
}

// Calculate distance between two coordinates in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Anti-cheat configuration
const ANTI_CHEAT_CONFIG = {
  MIN_SCAN_INTERVAL: 5 * 60 * 1000, // 5 minutes in milliseconds
  MIN_DISTANCE: 10, // 10 meters
  MAX_SCANS_PER_DAY: 100, // Maximum scans per day
  COOLDOWN_MESSAGE: 'Please wait before scanning again or move to a different location',
  LIMIT_MESSAGE: 'Daily scan limit reached. Try again tomorrow!'
};
// Bot Commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const webAppUrl = `${process.env.WEB_APP_URL}/webapp`;
  
  const options = {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🚀 Launch AlienWaste',
          web_app: { url: webAppUrl }
        }
      ]]
    }
  };
  
  bot.sendMessage(chatId, 
    '👽 Welcome to AlienWaste!\n\n' +
    'Feed your alien companion by scanning waste and help save the planet! 🌍\n\n' +
    'Click the button below to start your eco-adventure:',
    options
  );
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    '🤖 AlienWaste Commands:\n\n' +
    '/start - Launch the game\n' +
    '/stats - View your statistics\n' +
    '/leaderboard - Global rankings\n' +
    '/help - Show this help message\n\n' +
    '🎮 Use the Web App to play the full game!'
  );
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const gameState = initializeGameState(userId);
  
  const statsMessage = 
    `📊 Your AlienWaste Stats:\n\n` +
    `👽 Alien Level: ${gameState.alienLevel}\n` +
    `⚡ Eco Points: ${gameState.ecoPoints}\n` +
    `🎯 Total Scans: ${gameState.totalScans}\n` +
    `🔥 Streak: ${gameState.streakDays} days\n` +
    `🍽️ Hunger Level: ${gameState.hungerLevel}%\n\n` +
    `Launch the Web App to continue playing! 🚀`;
  
  bot.sendMessage(chatId, statsMessage);
});

// Web App Routes
app.get('/webapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes for Game Logic
app.post('/api/auth', (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!verifyTelegramWebAppData(initData, process.env.BOT_TOKEN)) {
      return res.status(401).json({ error: 'Invalid authentication data' });
    }
    
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get('user');
    const user = JSON.parse(userParam);
    
    const gameState = initializeGameState(user.id.toString());
    
    res.json({
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        username: user.username
      },
      gameState
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/scan-waste', (req, res) => {
  try {
    const { userId, wasteType, points, latitude, longitude } = req.body;
    const gameState = gameStates.get(userId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game state not found' });
    }
    
    const currentTime = Date.now();
    const currentDate = new Date().toDateString();
    
    // Reset daily counter if it's a new day
    if (gameState.lastScanDate !== currentDate) {
      gameState.scansToday = 0;
      gameState.lastScanDate = currentDate;
    }
    
    // Check daily scan limit
    if (gameState.scansToday >= ANTI_CHEAT_CONFIG.MAX_SCANS_PER_DAY) {
      return res.status(429).json({ 
        error: ANTI_CHEAT_CONFIG.LIMIT_MESSAGE,
        code: 'DAILY_LIMIT_EXCEEDED'
      });
    }
    
    // Check time-based cooldown
    if (gameState.lastScanTimestamp && 
        (currentTime - gameState.lastScanTimestamp) < ANTI_CHEAT_CONFIG.MIN_SCAN_INTERVAL) {
      const remainingTime = Math.ceil((ANTI_CHEAT_CONFIG.MIN_SCAN_INTERVAL - (currentTime - gameState.lastScanTimestamp)) / 1000 / 60);
      return res.status(429).json({ 
        error: `${ANTI_CHEAT_CONFIG.COOLDOWN_MESSAGE}. Wait ${remainingTime} more minutes.`,
        code: 'COOLDOWN_ACTIVE',
        remainingTime
      });
    }
    
    // Check location-based anti-cheat (if location is provided)
    if (latitude && longitude && gameState.lastScanLocation) {
      const distance = calculateDistance(
        gameState.lastScanLocation.latitude,
        gameState.lastScanLocation.longitude,
        latitude,
        longitude
      );
      
      if (distance < ANTI_CHEAT_CONFIG.MIN_DISTANCE && 
          gameState.lastScanTimestamp &&
          (currentTime - gameState.lastScanTimestamp) < ANTI_CHEAT_CONFIG.MIN_SCAN_INTERVAL) {
        return res.status(429).json({ 
          error: `${ANTI_CHEAT_CONFIG.COOLDOWN_MESSAGE}. Move at least ${ANTI_CHEAT_CONFIG.MIN_DISTANCE}m away.`,
          code: 'LOCATION_TOO_CLOSE',
          distance: Math.round(distance)
        });
      }
    }
    
    // Update game state
    gameState.ecoPoints += points;
    gameState.totalScans += 1;
    gameState.hungerLevel = Math.max(0, gameState.hungerLevel - 15);
    gameState.alienLevel = Math.floor(gameState.ecoPoints / 200) + 1;
    gameState.scansToday += 1;
    gameState.lastScanTimestamp = currentTime;
    
    // Update location if provided
    if (latitude && longitude) {
      gameState.lastScanLocation = { latitude, longitude };
    }
    
    // Update daily mission
    if (!gameState.dailyMissionCompleted) {
      gameState.dailyMissionProgress = Math.min(
        gameState.dailyMissionProgress + 1,
        gameState.dailyMissionTarget
      );
      
      if (gameState.dailyMissionProgress >= gameState.dailyMissionTarget) {
        gameState.dailyMissionCompleted = true;
        gameState.ecoPoints += 25;
      }
    }
    
    // Add to recent activity
    gameState.recentActivity.unshift({
      id: Date.now(),
      type: 'scan',
      text: `Scanned ${wasteType}`,
      time: 'Just now',
      points,
      icon: '♻️'
    });
    
    // Keep only last 10 activities
    gameState.recentActivity = gameState.recentActivity.slice(0, 10);
    
    gameStates.set(userId, gameState);
    
    res.json({
      success: true,
      gameState,
      message: `Successfully scanned ${wasteType}! +${points} points`,
      scansRemaining: ANTI_CHEAT_CONFIG.MAX_SCANS_PER_DAY - gameState.scansToday
    });
  } catch (error) {
    console.error('Scan waste error:', error);
    res.status(500).json({ error: 'Failed to process scan' });
  }
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const leaderboard = Array.from(gameStates.entries())
      .map(([userId, state]) => ({
        userId,
        ecoPoints: state.ecoPoints,
        alienLevel: state.alienLevel,
        totalScans: state.totalScans
      }))
      .sort((a, b) => b.ecoPoints - a.ecoPoints)
      .slice(0, 10);
    
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.post('/api/complete-mission', (req, res) => {
  try {
    const { userId } = req.body;
    const gameState = gameStates.get(userId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game state not found' });
    }
    
    gameState.dailyMissionCompleted = true;
    gameState.ecoPoints += 25;
    
    gameState.recentActivity.unshift({
      id: Date.now(),
      type: 'mission',
      text: 'Completed daily mission',
      time: 'Just now',
      points: 25,
      icon: '🎯'
    });
    
    gameStates.set(userId, gameState);
    
    res.json({ success: true, gameState });
  } catch (error) {
    console.error('Complete mission error:', error);
    res.status(500).json({ error: 'Failed to complete mission' });
  }
});

app.post('/api/regenerate-alien', (req, res) => {
  try {
    const { userId } = req.body;
    const gameState = gameStates.get(userId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game state not found' });
    }
    
    // Generate new alien with timestamp to ensure uniqueness
    const newSeed = generateAlienSeed(`${userId}_${Date.now()}`);
    const newAttributes = generateAlienAttributes(newSeed);
    
    gameState.alienSeed = newSeed;
    gameState.alienAttributes = newAttributes;
    
    gameStates.set(userId, gameState);
    
    res.json({ success: true, gameState });
  } catch (error) {
    console.error('Regenerate alien error:', error);
    res.status(500).json({ error: 'Failed to regenerate alien' });
  }
});

// Webhook endpoint
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AlienWaste Telegram Web App running on port ${PORT}`);
  console.log(`📱 Web App URL: ${process.env.WEB_APP_URL}/webapp`);
  
  // Set webhook if in production
  if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
    bot.setWebHook(process.env.WEBHOOK_URL);
    console.log(`🔗 Webhook set to: ${process.env.WEBHOOK_URL}`);
  }
});

module.exports = app;