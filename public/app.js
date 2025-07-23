// AlienWaste Telegram Web App JavaScript
class AlienWasteApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.user = null;
        this.gameState = null;
        this.currentScreen = 'loading';
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize Telegram Web App
            this.tg.ready();
            this.tg.expand();
            
            // Set theme
            this.tg.setHeaderColor('#000000');
            this.tg.setBackgroundColor('#000000');
            
            // Show loading screen
            this.showScreen('loading');
            
            // Simulate loading delay
            await this.delay(3000);
            
            // Authenticate user
            await this.authenticate();
            
            // Initialize UI
            this.initializeUI();
            
            // Show main game screen
            this.showScreen('game');
            
            // Setup periodic updates
            this.startPeriodicUpdates();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize app');
        }
    }
    
    async authenticate() {
        try {
            const initData = this.tg.initData;
            
            if (!initData) {
                throw new Error('No Telegram init data available');
            }
            
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ initData })
            });
            
            if (!response.ok) {
                throw new Error('Authentication failed');
            }
            
            const data = await response.json();
            this.user = data.user;
            this.gameState = data.gameState;
            
            console.log('Authenticated user:', this.user);
            
        } catch (error) {
            console.error('Authentication error:', error);
            // For development, create mock user
            this.user = { id: 'demo', first_name: 'Demo User' };
            this.gameState = {
                alienLevel: 1,
                ecoPoints: 0,
                hungerLevel: 50,
                totalScans: 0,
                accuracy: 100,
                streakDays: 0,
                dailyMissionProgress: 0,
                dailyMissionTarget: 5,
                dailyMissionCompleted: false,
                recentActivity: []
            };
        }
    }
    
    initializeUI() {
        // Update UI with game state
        this.updateGameUI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup Telegram Web App main button
        this.setupMainButton();
    }
    
    setupEventListeners() {
        // Scan waste button
        document.getElementById('scanWasteBtn').addEventListener('click', () => {
            this.scanWaste();
        });
        
        // View stats button
        document.getElementById('viewStatsBtn').addEventListener('click', () => {
            this.showStatsScreen();
        });
        
        // Complete mission button
        document.getElementById('completeMissionBtn').addEventListener('click', () => {
            this.completeMission();
        });
        
        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            this.showScreen('game');
        });
        
        // Alien character click
        document.getElementById('alienCharacter').addEventListener('click', () => {
            this.interactWithAlien();
        });
    }
    
    setupMainButton() {
        this.tg.MainButton.setText('SCAN WASTE');
        this.tg.MainButton.color = '#00FF41';
        this.tg.MainButton.textColor = '#000000';
        this.tg.MainButton.show();
        
        this.tg.MainButton.onClick(() => {
            this.scanWaste();
        });
    }
    
    async scanWaste() {
        try {
            // Get current location
            const position = await this.getCurrentLocation();
            
            // Show scanning animation
            this.showScanningAnimation();
            
            // Simulate waste types
            const wasteTypes = [
                { type: 'plastic', points: 10, color: '#00FF41' },
                { type: 'paper', points: 8, color: '#0080FF' },
                { type: 'glass', points: 15, color: '#8A2BE2' },
                { type: 'metal', points: 12, color: '#FF6B00' },
                { type: 'organic', points: 5, color: '#32CD32' }
            ];
            
            const randomWaste = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
            
            // Send to backend
            const response = await fetch('/api/scan-waste', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.user.id,
                    wasteType: randomWaste.type,
                    points: randomWaste.points,
                    latitude: position?.latitude,
                    longitude: position?.longitude
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Handle anti-cheat errors
                if (data.code === 'DAILY_LIMIT_EXCEEDED') {
                    this.showError('Daily scan limit reached! 🚫');
                } else if (data.code === 'COOLDOWN_ACTIVE') {
                    this.showError(`Please wait ${data.remainingTime} minutes ⏰`);
                } else if (data.code === 'LOCATION_TOO_CLOSE') {
                    this.showError(`Move ${10 - data.distance}m away from last scan 📍`);
                } else {
                    this.showError(data.error || 'Scan failed');
                }
                return;
            }
            
            // Success
            this.gameState = data.gameState;
            this.updateGameUI();
            
            // Show success message with remaining scans
            const remainingText = data.scansRemaining ? ` (${data.scansRemaining} left today)` : '';
            this.showSuccess(`Scanned ${randomWaste.type}! +${randomWaste.points} points${remainingText}`);
            
            // Animate alien feeding
            this.animateAlienFeeding();
            
            // Haptic feedback
            this.tg.HapticFeedback.impactOccurred('medium');
            
        } catch (error) {
            console.error('Scan waste error:', error);
            if (error.message.includes('location')) {
                this.showError('Location access required for scanning 📍');
            } else {
                this.showError('Failed to scan waste');
            }
        }
    }
    
    async getCurrentLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn('Geolocation not supported');
                resolve(null);
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn('Geolocation error:', error);
                    resolve(null);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    }
    
    async completeMission() {
        try {
            const response = await fetch('/api/complete-mission', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.user.id
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.gameState = data.gameState;
                this.updateGameUI();
                
                this.showSuccess('Daily mission completed! +25 points');
                this.tg.HapticFeedback.notificationOccurred('success');
            }
            
        } catch (error) {
            console.error('Complete mission error:', error);
            this.showError('Failed to complete mission');
        }
    }
    
    showStatsScreen() {
        this.updateStatsUI();
        this.showScreen('stats');
    }
    
    updateGameUI() {
        if (!this.gameState) return;
        
        // Update points
        document.getElementById('ecoPoints').textContent = this.gameState.ecoPoints.toLocaleString();
        
        // Update alien level
        document.getElementById('alienLevel').textContent = `LVL ${this.gameState.alienLevel}`;
        
        // Update hunger bar
        const hungerFill = document.getElementById('hungerFill');
        const hungerPercent = document.getElementById('hungerPercent');
        hungerFill.style.width = `${this.gameState.hungerLevel}%`;
        hungerPercent.textContent = `${this.gameState.hungerLevel}%`;
        
        // Update stats
        document.getElementById('totalScans').textContent = this.gameState.totalScans;
        document.getElementById('streakDays').textContent = this.gameState.streakDays;
        
        // Update mission progress
        const missionProgress = document.getElementById('missionProgress');
        const progressText = document.getElementById('progressText');
        const completeMissionBtn = document.getElementById('completeMissionBtn');
        const missionCard = document.getElementById('missionCard');
        
        const progressPercent = (this.gameState.dailyMissionProgress / this.gameState.dailyMissionTarget) * 100;
        missionProgress.style.width = `${progressPercent}%`;
        progressText.textContent = `${this.gameState.dailyMissionProgress}/${this.gameState.dailyMissionTarget} completed`;
        
        if (this.gameState.dailyMissionCompleted) {
            missionCard.classList.add('completed');
            completeMissionBtn.textContent = 'COMPLETED';
            completeMissionBtn.disabled = true;
        } else {
            missionCard.classList.remove('completed');
            completeMissionBtn.textContent = 'COMPLETE';
            completeMissionBtn.disabled = false;
        }
        
        // Update alien appearance based on state
        this.updateAlienAppearance();
    }
    
    updateStatsUI() {
        if (!this.gameState) return;
        
        document.getElementById('statAlienLevel').textContent = this.gameState.alienLevel;
        document.getElementById('statEcoPoints').textContent = this.gameState.ecoPoints.toLocaleString();
        document.getElementById('statTotalScans').textContent = this.gameState.totalScans;
        document.getElementById('statAccuracy').textContent = `${this.gameState.accuracy}%`;
        document.getElementById('statStreakDays').textContent = this.gameState.streakDays;
        
        // Update activity list
        const activityList = document.getElementById('activityList');
        activityList.innerHTML = '';
        
        this.gameState.recentActivity.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-info">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
                <div class="activity-points">+${activity.points}</div>
            `;
            activityList.appendChild(activityItem);
        });
    }
    
    updateAlienAppearance() {
        const alienBody = document.querySelector('.alien-body');
        const eyes = document.querySelectorAll('.eye');
        const mouth = document.querySelector('.alien-mouth');
        
        if (!alienBody || !this.gameState) return;
        
        // Use alien attributes if available
        const attributes = this.gameState.alienAttributes;
        if (attributes) {
            // Apply unique colors from attributes
            alienBody.style.background = `linear-gradient(135deg, ${attributes.primaryColor}, ${attributes.secondaryColor})`;
            alienBody.style.boxShadow = `0 0 20px ${attributes.glowColor}`;
            
            eyes.forEach(eye => {
                eye.style.background = this.gameState.hungerLevel > 70 ? '#FF4444' : 
                                      this.gameState.hungerLevel < 30 ? '#00FF41' : 
                                      attributes.eyeColor;
            });
            
            if (mouth) {
                mouth.style.background = attributes.mouthColor;
            }
            
            return;
        }
        
        // Change colors based on hunger level
        if (this.gameState.hungerLevel > 70) {
            // Very hungry - red tint
            alienBody.style.background = 'linear-gradient(135deg, #FF4444, #8A2BE2)';
            eyes.forEach(eye => eye.style.background = '#FF4444');
        } else if (this.gameState.hungerLevel < 30) {
            // Well fed - green tint
            alienBody.style.background = 'linear-gradient(135deg, #00FF41, #8A2BE2)';
            eyes.forEach(eye => eye.style.background = '#00FF41');
        } else {
            // Normal - default colors
            alienBody.style.background = 'linear-gradient(135deg, #8A2BE2, #9932CC)';
            eyes.forEach(eye => eye.style.background = '#0080FF');
        }
        
        // Adjust mouth size based on hunger
        if (this.gameState.hungerLevel > 80) {
            mouth.style.width = '20px';
            mouth.style.height = '12px';
        } else if (this.gameState.hungerLevel < 20) {
            mouth.style.width = '12px';
            mouth.style.height = '6px';
        } else {
            mouth.style.width = '16px';
            mouth.style.height = '8px';
        }
    }
    
    showScanningAnimation() {
        const scanBtn = document.getElementById('scanWasteBtn');
        const originalText = scanBtn.innerHTML;
        
        scanBtn.innerHTML = '<span class="button-icon">⚡</span><span>SCANNING...</span>';
        scanBtn.disabled = true;
        
        setTimeout(() => {
            scanBtn.innerHTML = originalText;
            scanBtn.disabled = false;
        }, 2000);
    }
    
    animateAlienFeeding() {
        const alien = document.getElementById('alienCharacter');
        alien.style.transform = 'scale(1.2)';
        
        setTimeout(() => {
            alien.style.transform = 'scale(1)';
        }, 300);
    }
    
    interactWithAlien() {
        // Simple interaction - show alien status
        const hungerStatus = this.gameState.hungerLevel > 70 ? 'Very Hungry!' : 
                           this.gameState.hungerLevel < 30 ? 'Well Fed!' : 'Hungry';
        
        this.showInfo(`Alien Level: ${this.gameState.alienLevel}\nStatus: ${hungerStatus}`);
        this.tg.HapticFeedback.impactOccurred('light');
    }
    
    startPeriodicUpdates() {
        // Increase hunger every 30 seconds
        setInterval(() => {
            if (this.gameState && this.gameState.hungerLevel < 100) {
                this.gameState.hungerLevel = Math.min(100, this.gameState.hungerLevel + 2);
                this.updateGameUI();
            }
        }, 30000);
    }
    
    async regenerateAlien() {
        try {
            const response = await fetch('/api/regenerate-alien', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.user.id
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.gameState = data.gameState;
                this.updateGameUI();
                this.showSuccess('New alien generated! 🎲');
            }
        } catch (error) {
            console.error('Regenerate alien error:', error);
            this.showError('Failed to regenerate alien');
        }
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }
    
    showSuccess(message) {
        this.tg.showAlert(message);
    }
    
    showError(message) {
        this.tg.showAlert(`❌ ${message}`);
    }
    
    showInfo(message) {
        this.tg.showAlert(message);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AlienWasteApp();
});

// Handle Telegram Web App events
window.addEventListener('load', () => {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
    }
});