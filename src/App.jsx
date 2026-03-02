import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function FruitCatchGame() {
  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const requestRef = useRef();
  const touchStartRef = useRef({ x: 0, y: 0 });

  // Responsive dimensions with dynamic sizing
  const [dimensions, setDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  
  // Responsive game constants
  const [gameConstants, setGameConstants] = useState({
    BASKET_WIDTH: Math.min(140, window.innerWidth * 0.2),
    BASKET_HEIGHT: Math.min(60, window.innerHeight * 0.09),
    BASKET_Y: window.innerHeight - Math.min(60, window.innerHeight * 0.09) - 30,
    FRUIT_SIZE: Math.min(44, window.innerWidth * 0.08),
  });

  // Update constants on resize
  useEffect(() => {
    const updateConstants = () => {
      setGameConstants({
        BASKET_WIDTH: Math.min(140, window.innerWidth * 0.2),
        BASKET_HEIGHT: Math.min(60, window.innerHeight * 0.09),
        BASKET_Y: window.innerHeight - Math.min(60, window.innerHeight * 0.09) - 30,
        FRUIT_SIZE: Math.min(44, window.innerWidth * 0.08),
      });
    };
    
    updateConstants();
    window.addEventListener('resize', updateConstants);
    return () => window.removeEventListener('resize', updateConstants);
  }, []);

  const { BASKET_WIDTH, BASKET_HEIGHT, BASKET_Y, FRUIT_SIZE } = gameConstants;

  // Fruit types with colors
  const FRUIT_TYPES = [
    { emoji: '🍎', color: '#FF3B3F', name: 'Apple' },
    { emoji: '🍊', color: '#FF8C42', name: 'Orange' },
    { emoji: '🍇', color: '#9B59B6', name: 'Grape' },
    { emoji: '🍓', color: '#E74C3C', name: 'Strawberry' },
    { emoji: '🍒', color: '#C0392B', name: 'Cherry' },
    { emoji: '🍑', color: '#F7DC6F', name: 'Peach' },
    { emoji: '🍉', color: '#27AE60', name: 'Watermelon' },
    { emoji: '🥝', color: '#229954', name: 'Kiwi' },
    { emoji: '🍍', color: '#F1C40F', name: 'Pineapple' },
    { emoji: '🍌', color: '#F4D03F', name: 'Banana' },
    { emoji: '🥭', color: '#F39C12', name: 'Mango' },
    { emoji: '🍐', color: '#7DCEA0', name: 'Pear' }
  ];
  
  // Progressive difficulty settings
  const DIFFICULTY_SETTINGS = {
    easy: {
      name: '🌱 EASY',
      speed: 2,
      spawnRate: 0.02,
      maxFruits: 3,
      color: '#2ECC71',
      secondaryColor: '#27AE60',
      bgGradient: ['#A8E6CF', '#56AB2F'],
      textColor: '#145A32',
      description: '🌸 Perfect for beginners',
      icon: '🌸',
      powerUps: true,
      powerUpRate: 0.005
    },
    medium: {
      name: '⚡ MEDIUM',
      speed: 3.5,
      spawnRate: 0.04,
      maxFruits: 4,
      color: '#F39C12',
      secondaryColor: '#E67E22',
      bgGradient: ['#FDE3A7', '#F39C12'],
      textColor: '#784B1A',
      description: '🎯 Balanced challenge',
      icon: '⚡',
      powerUps: true,
      powerUpRate: 0.01
    },
    hard: {
      name: '🔥 HARD',
      speed: 5.5,
      spawnRate: 0.07,
      maxFruits: 5,
      color: '#E74C3C',
      secondaryColor: '#C0392B',
      bgGradient: ['#F5B7B1', '#C0392B'],
      textColor: '#641E16',
      description: '⚡ Fast & intense',
      icon: '🔥',
      powerUps: true,
      powerUpRate: 0.015
    }
  };

  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [totalFruits, setTotalFruits] = useState(0);
  const [lives, setLives] = useState(3);
  const [difficulty, setDifficulty] = useState('medium');
  const [settings, setSettings] = useState(DIFFICULTY_SETTINGS.medium);
  
  // Game objects
  const [fruits, setFruits] = useState([]);
  const [powerUps, setPowerUps] = useState([]);
  const [effects, setEffects] = useState([]);
  
  // Basket position
  const [basketX, setBasketX] = useState((dimensions.width - BASKET_WIDTH) / 2);
  const [targetX, setTargetX] = useState((dimensions.width - BASKET_WIDTH) / 2);
  
  // Game modifiers
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [timeScale, setTimeScale] = useState(1);
  const [timeScaleTimer, setTimeScaleTimer] = useState(null);
  
  // Statistics
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    totalScore: 0,
    bestCatch: 0,
    powerUpsCollected: 0
  });

  // Audio
  const audioRef = useRef(null);

  // Load saved data
  useEffect(() => {
    const savedHighScore = localStorage.getItem('fruitHighScore');
    if (savedHighScore) setHighScore(parseInt(savedHighScore));
    
    const savedStats = localStorage.getItem('fruitStats');
    if (savedStats) setStats(JSON.parse(savedStats));
    
    const savedDifficulty = localStorage.getItem('favDiff');
    if (savedDifficulty && ['easy','medium','hard'].includes(savedDifficulty)) {
      setDifficulty(savedDifficulty);
    }
  }, []);

  // Update difficulty settings
  useEffect(() => {
    setSettings(DIFFICULTY_SETTINGS[difficulty]);
    localStorage.setItem('favDiff', difficulty);
  }, [difficulty]);

  // Update high score and stats
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('fruitHighScore', score);
      addEffect(dimensions.width/2, dimensions.height/3, 'record', '🏆 NEW RECORD!');
      if (vibration && window.navigator.vibrate) {
        window.navigator.vibrate([100, 50, 100]);
      }
    }
  }, [score, highScore, dimensions, vibration]);

  // Save stats
  useEffect(() => {
    if (gameOver) {
      const newStats = {
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        totalScore: stats.totalScore + score,
        bestCatch: Math.max(stats.bestCatch, score)
      };
      setStats(newStats);
      localStorage.setItem('fruitStats', JSON.stringify(newStats));
    }
  }, [gameOver, score]);

  // Handle resize with debounce
  useEffect(() => {
    let timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
        setTargetX(prev => Math.min(prev, window.innerWidth - BASKET_WIDTH));
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [BASKET_WIDTH]);

  // Sound function
  const playSound = useCallback((type, pitch = 1) => {
    if (!soundOn) return;
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioRef.current.state === 'suspended') {
      audioRef.current.resume();
    }

    const now = audioRef.current.currentTime;
    const osc = audioRef.current.createOscillator();
    const gain = audioRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioRef.current.destination);

    switch(type) {
      case 'catch':
        osc.frequency.value = 800 * pitch;
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.frequency.setValueAtTime(800 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(1200 * pitch, now + 0.1);
        break;
      case 'miss':
        osc.frequency.value = 300;
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        break;
      case 'gameover':
        osc.type = 'sawtooth';
        osc.frequency.value = 200;
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.7);
        break;
      case 'combo':
        osc.frequency.value = 1200;
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        break;
      case 'powerup':
        osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
        break;
      case 'select':
        osc.frequency.value = 500;
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        break;
    }
    osc.start(now);
    osc.stop(now + (type === 'gameover' ? 0.8 : 0.15));
  }, [soundOn]);

  // Vibration feedback
  const vibrate = useCallback((pattern) => {
    if (vibration && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  }, [vibration]);

  // Add visual effect
  const addEffect = (x, y, type, value = '') => {
    setEffects(prev => [...prev, {
      id: Date.now() + Math.random(),
      x, y,
      type,
      value,
      life: 1,
    }]);
  };

  // Update combo
  const updateCombo = (fruitX, fruitY) => {
    setCombo(prev => {
      const newCombo = prev + 1;
      if (newCombo % 3 === 0) {
        playSound('combo');
        addEffect(dimensions.width/2, dimensions.height/2, 'combo', `x${newCombo}!`);
        vibrate(100);
      }
      if (newCombo > 1) {
        addEffect(fruitX, fruitY, 'plus', `+${10 + newCombo * 2}`);
      }
      return newCombo;
    });
    
    if (comboTimer) clearTimeout(comboTimer);
    
    const timer = setTimeout(() => {
      setCombo(0);
    }, 2000);
    setComboTimer(timer);
  };

  // Spawn power-up
  const spawnPowerUp = useCallback(() => {
    if (!gameActive || lives <= 0 || !settings.powerUps) return;
    
    const x = FRUIT_SIZE + Math.random() * (dimensions.width - FRUIT_SIZE * 2);
    const types = [
      { type: 'heart', emoji: '❤️', color: '#FF69B4', effect: 'extraLife' },
      { type: 'clock', emoji: '⏰', color: '#3498DB', effect: 'slowTime' },
      { type: 'star', emoji: '⭐', color: '#F1C40F', effect: 'doubleScore' },
      { type: 'lightning', emoji: '⚡', color: '#F39C12', effect: 'speedBoost' }
    ];
    
    const powerUpType = types[Math.floor(Math.random() * types.length)];
    
    setPowerUps(prev => [...prev, {
      id: Date.now() + Math.random(),
      x,
      y: FRUIT_SIZE/2,
      type: powerUpType.type,
      emoji: powerUpType.emoji,
      color: powerUpType.color,
      effect: powerUpType.effect,
      speed: settings.speed * 0.8,
      rotation: 0,
    }]);
  }, [gameActive, lives, settings, dimensions.width, FRUIT_SIZE]);

  // Spawn fruit
  const spawnFruit = useCallback(() => {
    if (!gameActive || lives <= 0 || fruits.length >= settings.maxFruits) return;
    
    const fruitData = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
    const x = FRUIT_SIZE + Math.random() * (dimensions.width - FRUIT_SIZE * 2);
    const speed = settings.speed * (0.9 + Math.random() * 0.3) * timeScale;
    
    setFruits(prev => [...prev, {
      id: Date.now() + Math.random(),
      x,
      y: FRUIT_SIZE/2,
      type: fruitData.emoji,
      color: fruitData.color,
      name: fruitData.name,
      speed,
      rotation: 0,
      scale: 1,
      glow: Math.random() * 0.5 + 0.5,
    }]);
  }, [gameActive, lives, fruits.length, settings, dimensions.width, FRUIT_SIZE, timeScale]);

  // Apply power-up effect
  const applyPowerUp = (powerUp) => {
    setStats(prev => ({
      ...prev,
      powerUpsCollected: prev.powerUpsCollected + 1
    }));
    
    addEffect(powerUp.x, powerUp.y, 'powerup', powerUp.emoji);
    playSound('powerup');
    vibrate([50, 50, 50]);
    
    switch(powerUp.effect) {
      case 'extraLife':
        setLives(prev => Math.min(prev + 1, 5));
        addEffect(dimensions.width/2, dimensions.height/2, 'message', '❤️ +1 LIFE!');
        break;
        
      case 'slowTime':
        setTimeScale(0.5);
        addEffect(dimensions.width/2, dimensions.height/2, 'message', '⏰ SLOW MO!');
        if (timeScaleTimer) clearTimeout(timeScaleTimer);
        const timer = setTimeout(() => {
          setTimeScale(1);
        }, 5000);
        setTimeScaleTimer(timer);
        break;
        
      case 'doubleScore':
        setScore(prev => prev + 50);
        addEffect(dimensions.width/2, dimensions.height/2, 'message', '✨ DOUBLE POINTS!');
        break;
        
      case 'speedBoost':
        setTimeScale(1.5);
        addEffect(dimensions.width/2, dimensions.height/2, 'message', '⚡ SPEED BOOST!');
        if (timeScaleTimer) clearTimeout(timeScaleTimer);
        const speedTimer = setTimeout(() => {
          setTimeScale(1);
        }, 3000);
        setTimeScaleTimer(speedTimer);
        break;
        
      default:
        break;
    }
  };

  // Reset game
  const resetGame = () => {
    setLives(3);
    setScore(0);
    setFruits([]);
    setPowerUps([]);
    setEffects([]);
    setCombo(0);
    setTimeScale(1);
    if (comboTimer) clearTimeout(comboTimer);
    if (timeScaleTimer) clearTimeout(timeScaleTimer);
    setGameOver(false);
    setGamePaused(false);
    setTargetX((dimensions.width - BASKET_WIDTH) / 2);
  };

  // Check collision
  const checkCollision = useCallback((item, isPowerUp = false) => {
    if (!item) return false;
    
    const itemLeft = item.x - FRUIT_SIZE/2.5;
    const itemRight = item.x + FRUIT_SIZE/2.5;
    const itemTop = item.y - FRUIT_SIZE/2.5;
    const itemBottom = item.y + FRUIT_SIZE/2.5;
    
    const basketLeft = basketX;
    const basketRight = basketX + BASKET_WIDTH;
    const basketTop = BASKET_Y;
    const basketBottom = BASKET_Y + BASKET_HEIGHT;
    
    return !(itemRight < basketLeft || 
             itemLeft > basketRight || 
             itemBottom < basketTop || 
             itemTop > basketBottom);
  }, [basketX, BASKET_WIDTH, BASKET_Y, BASKET_HEIGHT, FRUIT_SIZE]);

  // Game loop
  useEffect(() => {
    if (!gameActive || gamePaused) return;

    const gameInterval = setInterval(() => {
      // Update fruits
      setFruits(prev => {
        const newFruits = [];

        for (const fruit of prev) {
          const newY = fruit.y + fruit.speed * timeScale;
          const updatedFruit = { 
            ...fruit, 
            y: newY, 
            rotation: fruit.rotation + 0.05,
            scale: 1 + Math.sin(Date.now() * 0.01) * 0.05
          };

          if (checkCollision(updatedFruit)) {
            const points = 10 + (combo * 2);
            setScore(s => s + points);
            setTotalFruits(t => t + 1);
            addEffect(updatedFruit.x, updatedFruit.y, 'catch', `+${points}`);
            playSound('catch', 1 + Math.random() * 0.2);
            updateCombo(updatedFruit.x, updatedFruit.y);
            vibrate(20);
            continue;
          }

          if (newY - FRUIT_SIZE/2 > dimensions.height) {
            setLives(l => {
              const newLives = l - 1;
              addEffect(updatedFruit.x, dimensions.height - 50, 'miss', '💧');
              playSound('miss');
              vibrate(100);
              setCombo(0);
              
              if (newLives <= 0) {
                setGameActive(false);
                setGameOver(true);
                playSound('gameover');
                vibrate([200, 100, 200]);
              }
              return newLives;
            });
            continue;
          }

          newFruits.push(updatedFruit);
        }

        return newFruits;
      });

      // Update power-ups
      setPowerUps(prev => {
        const newPowerUps = [];

        for (const powerUp of prev) {
          const newY = powerUp.y + powerUp.speed * timeScale;
          const updatedPowerUp = { 
            ...powerUp, 
            y: newY, 
            rotation: powerUp.rotation + 0.1
          };

          if (checkCollision(updatedPowerUp, true)) {
            applyPowerUp(updatedPowerUp);
            continue;
          }

          if (newY - FRUIT_SIZE/2 > dimensions.height) {
            continue;
          }

          newPowerUps.push(updatedPowerUp);
        }

        return newPowerUps;
      });

      // Update effects
      setEffects(prev => 
        prev
          .map(e => ({ 
            ...e, 
            life: e.life - 0.015,
            y: e.y - 0.8
          }))
          .filter(e => e.life > 0)
      );

      // Spawn objects
      if (fruits.length < settings.maxFruits && Math.random() < settings.spawnRate) {
        spawnFruit();
      }
      
      if (Math.random() < (settings.powerUpRate || 0.01)) {
        spawnPowerUp();
      }
    }, 1000 / 60);

    return () => clearInterval(gameInterval);
  }, [gameActive, gamePaused, settings, fruits.length, checkCollision, spawnFruit, spawnPowerUp, playSound, dimensions.height, FRUIT_SIZE, combo, timeScale, vibrate]);

  // Smooth basket movement
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setBasketX(prev => {
        const diff = targetX - prev;
        if (Math.abs(diff) < 1) return targetX;
        return prev + diff * 0.15;
      });
    }, 16);
    return () => clearInterval(moveInterval);
  }, [targetX]);

  // Handle pointer movement
  const handlePointerMove = useCallback((e) => {
    if (!gameActive || gamePaused) return;
    
    let clientX;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      e.preventDefault();
    } else {
      clientX = e.clientX;
    }
    
    let newTarget = clientX - BASKET_WIDTH / 2;
    newTarget = Math.max(5, Math.min(newTarget, dimensions.width - BASKET_WIDTH - 5));
    setTargetX(newTarget);
  }, [gameActive, gamePaused, dimensions.width, BASKET_WIDTH]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      if (!gameActive || gamePaused) return;
      const step = 25;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setTargetX(prev => Math.max(5, prev - step));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setTargetX(prev => Math.min(dimensions.width - BASKET_WIDTH - 5, prev + step));
      } else if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        setGamePaused(prev => !prev);
        addEffect(dimensions.width/2, dimensions.height/2, 'message', gamePaused ? '▶ RESUME' : '⏸ PAUSED');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameActive, gamePaused, dimensions.width, BASKET_WIDTH]);

  // Start game
  const startGame = (chosenDiff) => {
    setDifficulty(chosenDiff);
    setGameStarted(true);
    setGameActive(true);
    setGameOver(false);
    resetGame();
    playSound('select');
    
    setTimeout(() => {
      if (gameActive) {
        for (let i = 0; i < 2; i++) {
          setTimeout(() => spawnFruit(), i * 300);
        }
      }
    }, 500);
  };

  // Play again
  const playAgain = () => {
    startGame(difficulty);
  };

  // Quit to menu
  const quitToMenu = () => {
    setGameStarted(false);
    setGameActive(false);
    setGameOver(false);
    setGamePaused(false);
    setFruits([]);
    setPowerUps([]);
    setEffects([]);
    setLives(3);
    setScore(0);
    setCombo(0);
    setTimeScale(1);
    if (comboTimer) clearTimeout(comboTimer);
    if (timeScaleTimer) clearTimeout(timeScaleTimer);
    playSound('select');
  };

  // Toggle sound
  const toggleSound = () => {
    setSoundOn(!soundOn);
  };

  // Toggle vibration
  const toggleVibration = () => {
    setVibration(!vibration);
  };

  // Draw everything
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Dynamic gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
    gradient.addColorStop(0, settings.bgGradient[0]);
    gradient.addColorStop(1, settings.bgGradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw decorative elements
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(
        dimensions.width * (i * 0.12 + 0.05), 
        dimensions.height * 0.3, 
        60, 0, Math.PI * 2
      );
      ctx.fillStyle = 'white';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw power-ups
    powerUps.forEach(powerUp => {
      ctx.shadowColor = powerUp.color;
      ctx.shadowBlur = 30;
      
      ctx.save();
      ctx.translate(powerUp.x, powerUp.y);
      ctx.rotate(powerUp.rotation);
      
      // Glow effect
      ctx.beginPath();
      ctx.arc(0, 0, FRUIT_SIZE/2, 0, Math.PI * 2);
      ctx.fillStyle = powerUp.color + '60';
      ctx.fill();
      
      // Power-up emoji
      ctx.font = `${FRUIT_SIZE}px 'Segoe UI Emoji'`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.shadowColor = powerUp.color;
      ctx.shadowBlur = 30;
      ctx.fillText(powerUp.emoji, 0, 0);
      
      ctx.restore();
    });

    // Draw basket with enhanced 3D effect
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;
    
    // Basket shadow
    ctx.fillStyle = '#5D3A1A';
    ctx.beginPath();
    ctx.moveTo(basketX - 8, BASKET_Y + 5);
    ctx.lineTo(basketX + BASKET_WIDTH + 8, BASKET_Y + 5);
    ctx.lineTo(basketX + BASKET_WIDTH + 12, BASKET_Y + BASKET_HEIGHT + 5);
    ctx.lineTo(basketX - 12, BASKET_Y + BASKET_HEIGHT + 5);
    ctx.closePath();
    ctx.fill();
    
    // Basket body
    const basketGradient = ctx.createLinearGradient(basketX, BASKET_Y, basketX + BASKET_WIDTH, BASKET_Y + BASKET_HEIGHT);
    basketGradient.addColorStop(0, '#D2691E');
    basketGradient.addColorStop(0.5, '#8B4513');
    basketGradient.addColorStop(1, '#5D3A1A');
    
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = basketGradient;
    ctx.beginPath();
    ctx.moveTo(basketX - 5, BASKET_Y);
    ctx.lineTo(basketX + BASKET_WIDTH + 5, BASKET_Y);
    ctx.lineTo(basketX + BASKET_WIDTH, BASKET_Y + BASKET_HEIGHT);
    ctx.lineTo(basketX, BASKET_Y + BASKET_HEIGHT);
    ctx.closePath();
    ctx.fill();
    
    // Basket rim
    ctx.shadowBlur = 5;
    ctx.strokeStyle = '#F4A460';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(basketX - 8, BASKET_Y - 2);
    ctx.lineTo(basketX + BASKET_WIDTH + 8, BASKET_Y - 2);
    ctx.stroke();

    // Draw fruits with enhanced visibility
    fruits.forEach(fruit => {
      // Fruit glow
      ctx.shadowColor = fruit.color;
      ctx.shadowBlur = 30 * fruit.glow;
      
      // Background glow
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y, FRUIT_SIZE/2, 0, Math.PI * 2);
      ctx.fillStyle = fruit.color + '40';
      ctx.fill();
      
      // Fruit emoji with effects
      ctx.save();
      ctx.translate(fruit.x, fruit.y);
      ctx.rotate(fruit.rotation);
      ctx.scale(fruit.scale, fruit.scale);
      ctx.font = `${FRUIT_SIZE}px 'Segoe UI Emoji', 'Apple Color Emoji'`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // White highlight
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 15;
      ctx.fillStyle = 'white';
      ctx.fillText(fruit.type, -2, -2);
      
      // Main fruit
      ctx.shadowColor = fruit.color;
      ctx.shadowBlur = 30;
      ctx.fillStyle = 'white';
      ctx.fillText(fruit.type, 0, 0);
      
      ctx.restore();
    });

    // Draw effects
    effects.forEach(effect => {
      ctx.globalAlpha = effect.life;
      ctx.shadowBlur = 20;
      
      if (effect.type === 'catch') {
        ctx.shadowColor = '#FFD700';
        ctx.font = 'bold 28px "Segoe UI"';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(effect.value || '✨', effect.x, effect.y);
      } else if (effect.type === 'miss') {
        ctx.shadowColor = '#3498DB';
        ctx.font = '32px "Segoe UI Emoji"';
        ctx.fillStyle = '#3498DB';
        ctx.fillText('💧', effect.x, effect.y);
      } else if (effect.type === 'plus') {
        ctx.shadowColor = '#2ECC71';
        ctx.font = 'bold 24px "Segoe UI"';
        ctx.fillStyle = '#2ECC71';
        ctx.fillText(effect.value, effect.x, effect.y);
      } else if (effect.type === 'combo') {
        ctx.shadowColor = '#E74C3C';
        ctx.shadowBlur = 30;
        ctx.font = 'bold 48px "Segoe UI"';
        ctx.fillStyle = '#E74C3C';
        ctx.textAlign = 'center';
        ctx.fillText(effect.value || 'COMBO!', effect.x, effect.y - 30);
      } else if (effect.type === 'record') {
        ctx.shadowColor = '#F1C40F';
        ctx.shadowBlur = 40;
        ctx.font = 'bold min(56px, 8vw) "Segoe UI"';
        ctx.fillStyle = '#F1C40F';
        ctx.textAlign = 'center';
        ctx.fillText(effect.value, effect.x, effect.y);
      } else if (effect.type === 'powerup') {
        ctx.shadowColor = '#9B59B6';
        ctx.shadowBlur = 40;
        ctx.font = '48px "Segoe UI Emoji"';
        ctx.fillStyle = '#9B59B6';
        ctx.textAlign = 'center';
        ctx.fillText(effect.value, effect.x, effect.y - 20);
      } else if (effect.type === 'message') {
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 30;
        ctx.font = 'bold min(40px, 6vw) "Segoe UI"';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(effect.value, effect.x, effect.y);
      }
    });

    // Draw HUD with responsive sizing
    const heartSize = Math.min(40, dimensions.width * 0.06);
    const scoreSize = Math.min(48, dimensions.width * 0.08);
    const textSize = Math.min(20, dimensions.width * 0.04);
    
    ctx.shadowBlur = 0;
    ctx.font = `${heartSize}px "Segoe UI Emoji"`;
    
    // Lives
    for (let i = 0; i < 3; i++) {
      const x = 10 + i * (heartSize + 5);
      const y = heartSize + 10;
      
      if (i < lives) {
        ctx.shadowColor = '#FF1493';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#FF4444';
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#CCCCCC';
      }
      ctx.fillText('❤️', x, y);
    }

    // Score
    ctx.shadowColor = settings.color;
    ctx.shadowBlur = 20;
    ctx.font = `bold ${scoreSize}px "Segoe UI"`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'right';
    ctx.fillText(`🍎 ${score}`, dimensions.width - 20, scoreSize + 10);

    // High score
    ctx.shadowBlur = 10;
    ctx.font = `bold ${textSize}px "Segoe UI"`;
    ctx.fillStyle = '#F1C40F';
    ctx.fillText(`🏆 ${highScore}`, dimensions.width - 20, scoreSize + 45);

    // Combo
    if (combo > 1) {
      ctx.shadowColor = '#E74C3C';
      ctx.shadowBlur = 30;
      ctx.font = `bold ${textSize * 1.5}px "Segoe UI"`;
      ctx.fillStyle = '#E74C3C';
      ctx.textAlign = 'center';
      ctx.fillText(`x${combo} COMBO!`, dimensions.width/2, 70);
    }

    // Time scale indicator
    if (timeScale !== 1) {
      ctx.shadowColor = '#3498DB';
      ctx.shadowBlur = 20;
      ctx.font = `bold ${textSize}px "Segoe UI"`;
      ctx.fillStyle = '#3498DB';
      ctx.textAlign = 'left';
      ctx.fillText(timeScale < 1 ? '⏰ SLOW' : '⚡ FAST', 10, dimensions.height - 20);
    }

    // Game paused overlay
    if (gamePaused && gameActive) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      
      ctx.shadowColor = '#FFF';
      ctx.shadowBlur = 40;
      ctx.font = `bold ${scoreSize}px "Segoe UI"`;
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.fillText('⏸ PAUSED', dimensions.width/2, dimensions.height/2);
      
      ctx.font = `${textSize}px "Segoe UI"`;
      ctx.fillText('Press SPACE to resume', dimensions.width/2, dimensions.height/2 + 60);
    }

    // Game over overlay
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      
      ctx.shadowColor = '#E74C3C';
      ctx.shadowBlur = 40;
      ctx.font = `bold ${scoreSize * 1.2}px "Segoe UI"`;
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', dimensions.width/2, dimensions.height/2 - 60);
      
      ctx.shadowColor = '#F1C40F';
      ctx.shadowBlur = 30;
      ctx.font = `bold ${scoreSize}px "Segoe UI"`;
      ctx.fillStyle = '#F1C40F';
      ctx.fillText(`${score}`, dimensions.width/2, dimensions.height/2 + 20);
      
      ctx.shadowBlur = 20;
      ctx.font = `${textSize}px "Segoe UI"`;
      ctx.fillStyle = '#FFF';
      ctx.fillText(`Best: ${highScore}`, dimensions.width/2, dimensions.height/2 + 70);
    }

    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
  }, [dimensions, gameActive, gamePaused, gameOver, lives, score, highScore, fruits, powerUps, basketX, effects, combo, timeScale, difficulty, settings, BASKET_WIDTH, BASKET_Y, BASKET_HEIGHT, FRUIT_SIZE]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
        fontFamily: '"Segoe UI", Arial, sans-serif',
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onTouchStart={(e) => e.preventDefault()}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
        }}
      />

      {/* Fully Responsive Start Screen */}
      {!gameStarted && !gameOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(95%, 600px)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'rgba(255, 255, 255, 0.98)',
          padding: 'clamp(20px, 5vw, 50px)',
          borderRadius: 'clamp(20px, 5vw, 50px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.4), 0 0 0 4px white, 0 0 0 8px #2ECC71',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          animation: 'float 3s ease-in-out infinite',
        }}>
          {/* Title */}
          <h1 style={{ 
            fontSize: 'clamp(32px, 10vw, 64px)', 
            margin: '0 0 10px 0',
            background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 10px 5px rgba(0,0,0,0.1))',
            lineHeight: 1.2,
          }}>
            🍎 FRUIT CATCH
          </h1>
          
          <p style={{ 
            fontSize: 'clamp(14px, 4vw, 20px)', 
            color: '#666', 
            marginBottom: 'clamp(20px, 5vw, 40px)',
            fontStyle: 'italic',
          }}>
            by Basket Masters 🧺
          </p>
          
          {/* Difficulty selector - responsive grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 'clamp(10px, 2vw, 20px)',
            marginBottom: 'clamp(20px, 5vw, 40px)',
          }}>
            {['easy', 'medium', 'hard'].map((diff) => {
              const diffSettings = DIFFICULTY_SETTINGS[diff];
              const isSelected = difficulty === diff;
              
              return (
                <div
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  style={{
                    padding: 'clamp(15px, 3vw, 25px) clamp(5px, 2vw, 10px)',
                    background: isSelected ? `linear-gradient(135deg, ${diffSettings.color}, ${diffSettings.secondaryColor})` : '#F8F9FA',
                    borderRadius: 'clamp(15px, 3vw, 30px)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: isSelected ? 'scale(1.05) translateY(-5px)' : 'scale(1)',
                    boxShadow: isSelected ? `0 20px 30px ${diffSettings.color}80` : '0 5px 15px rgba(0,0,0,0.1)',
                    border: isSelected ? '3px solid white' : '3px solid transparent',
                  }}
                >
                  <div style={{ fontSize: 'clamp(24px, 6vw, 40px)', marginBottom: '5px' }}>
                    {diffSettings.icon}
                  </div>
                  <div style={{ 
                    fontSize: 'clamp(14px, 3.5vw, 18px)', 
                    fontWeight: 'bold',
                    color: isSelected ? 'white' : diffSettings.textColor,
                    marginBottom: '5px',
                  }}>
                    {diffSettings.name.split(' ')[1]}
                  </div>
                  <div style={{ 
                    fontSize: 'clamp(11px, 2.5vw, 14px)', 
                    color: isSelected ? 'rgba(255,255,255,0.9)' : '#666',
                  }}>
                    {diffSettings.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats preview - responsive grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'clamp(10px, 2vw, 20px)',
            marginBottom: 'clamp(20px, 5vw, 30px)',
            background: '#F8F9FA',
            padding: 'clamp(15px, 3vw, 20px)',
            borderRadius: 'clamp(15px, 3vw, 30px)',
          }}>
            <div>
              <div style={{ fontSize: 'clamp(11px, 2.5vw, 14px)', color: '#666' }}>Speed</div>
              <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 'bold', color: settings.color }}>
                {settings.speed}x
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(11px, 2.5vw, 14px)', color: '#666' }}>Max Fruits</div>
              <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 'bold', color: settings.color }}>
                {settings.maxFruits}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(11px, 2.5vw, 14px)', color: '#666' }}>Power-ups</div>
              <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 'bold', color: '#9B59B6' }}>
                ✓
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(11px, 2.5vw, 14px)', color: '#666' }}>Best Score</div>
              <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 'bold', color: '#F1C40F' }}>
                {highScore}
              </div>
            </div>
          </div>

          {/* Settings row */}
          <div style={{
            display: 'flex',
            gap: 'clamp(10px, 2vw, 20px)',
            justifyContent: 'center',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}>
            <button
              onClick={toggleSound}
              style={{
                background: '#F8F9FA',
                border: '3px solid #DDD',
                borderRadius: '50px',
                padding: 'clamp(8px, 2vw, 12px) clamp(15px, 3vw, 25px)',
                fontSize: 'clamp(16px, 4vw, 20px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {soundOn ? '🔊 Sound On' : '🔇 Sound Off'}
            </button>
            
            <button
              onClick={toggleVibration}
              style={{
                background: '#F8F9FA',
                border: '3px solid #DDD',
                borderRadius: '50px',
                padding: 'clamp(8px, 2vw, 12px) clamp(15px, 3vw, 25px)',
                fontSize: 'clamp(16px, 4vw, 20px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {vibration ? '📳 Vibration On' : '📴 Vibration Off'}
            </button>
          </div>

          {/* Start button */}
          <button
            onClick={() => startGame(difficulty)}
            style={{
              background: `linear-gradient(135deg, ${settings.color}, ${settings.secondaryColor})`,
              color: 'white',
              border: 'none',
              fontSize: 'clamp(24px, 8vw, 36px)',
              fontWeight: 'bold',
              padding: 'clamp(15px, 4vw, 20px) clamp(30px, 8vw, 50px)',
              borderRadius: '60px',
              cursor: 'pointer',
              boxShadow: `0 15px 30px ${settings.color}80, 0 5px 0 ${settings.secondaryColor}`,
              marginBottom: 'clamp(15px, 4vw, 20px)',
              width: '100%',
              transition: 'all 0.2s',
              textShadow: '0 2px 5px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = `0 20px 40px ${settings.color}80, 0 7px 0 ${settings.secondaryColor}`;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = `0 15px 30px ${settings.color}80, 0 5px 0 ${settings.secondaryColor}`;
            }}
          >
            ▶ START GAME
          </button>

          {/* Instructions - responsive flex wrap */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'center', 
            gap: 'clamp(10px, 3vw, 30px)',
            fontSize: 'clamp(12px, 3vw, 16px)',
            color: '#666',
          }}>
            <span>🖱️ Move Mouse</span>
            <span>📱 Touch Screen</span>
            <span>⌨️ ← → Keys</span>
            <span>⏸️ Space to Pause</span>
          </div>
          
          {/* Total stats */}
          <div style={{
            marginTop: 'clamp(15px, 4vw, 20px)',
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            color: '#999',
            borderTop: '2px dashed #DDD',
            paddingTop: 'clamp(10px, 3vw, 15px)',
          }}>
            🎮 Games: {stats.gamesPlayed} | ⭐ Total: {stats.totalScore} | 💫 Power-ups: {stats.powerUpsCollected}
          </div>
        </div>
      )}

      {/* Responsive Game Over Screen */}
      {gameOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(95%, 500px)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'rgba(0, 0, 0, 0.95)',
          padding: 'clamp(20px, 5vw, 50px)',
          borderRadius: 'clamp(20px, 5vw, 50px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 4px #E74C3C, 0 0 0 8px white',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ fontSize: 'clamp(48px, 15vw, 80px)', marginBottom: '10px', filter: 'drop-shadow(0 0 20px #E74C3C)' }}>
            💔
          </div>
          
          <h2 style={{ 
            fontSize: 'clamp(32px, 8vw, 48px)', 
            color: '#FFF', 
            margin: '0 0 20px 0',
            textShadow: '0 0 20px #E74C3C',
          }}>
            GAME OVER
          </h2>
          
          {/* Score display */}
          <div style={{
            background: 'linear-gradient(135deg, #2C3E50, #34495E)',
            padding: 'clamp(15px, 4vw, 30px)',
            borderRadius: 'clamp(15px, 4vw, 30px)',
            marginBottom: 'clamp(20px, 5vw, 30px)',
            border: '2px solid #F1C40F',
          }}>
            <div style={{ fontSize: 'clamp(40px, 12vw, 64px)', fontWeight: 'bold', color: '#F1C40F', marginBottom: '5px' }}>
              {score}
            </div>
            <div style={{ color: '#FFF', fontSize: 'clamp(14px, 3.5vw, 18px)', marginBottom: '15px' }}>Final Score</div>
            
            <div style={{ 
              padding: 'clamp(10px, 3vw, 15px)',
              background: score === highScore ? 'rgba(241, 196, 15, 0.2)' : 'transparent',
              borderRadius: '20px',
              border: score === highScore ? '2px solid #F1C40F' : 'none',
            }}>
              <div style={{ fontSize: 'clamp(20px, 6vw, 28px)', color: '#F1C40F' }}>
                🏆 {highScore}
              </div>
              <div style={{ color: '#AAA', fontSize: 'clamp(12px, 3vw, 14px)' }}>Best Score</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gap: 'clamp(10px, 2vw, 15px)', marginBottom: 'clamp(15px, 4vw, 25px)' }}>
            <button
              onClick={playAgain}
              style={{
                background: `linear-gradient(135deg, ${settings.color}, ${settings.secondaryColor})`,
                color: 'white',
                border: 'none',
                fontSize: 'clamp(20px, 6vw, 28px)',
                fontWeight: 'bold',
                padding: 'clamp(12px, 3vw, 20px)',
                borderRadius: '40px',
                cursor: 'pointer',
                boxShadow: `0 10px 20px ${settings.color}80`,
              }}
            >
              🔄 PLAY AGAIN
            </button>
            
            <button
              onClick={quitToMenu}
              style={{
                background: '#7F8C8D',
                color: 'white',
                border: 'none',
                fontSize: 'clamp(18px, 5vw, 24px)',
                padding: 'clamp(10px, 2.5vw, 15px)',
                borderRadius: '40px',
                cursor: 'pointer',
              }}
            >
              🏠 MAIN MENU
            </button>
          </div>

          {/* Difficulty quick switch - responsive grid */}
          <div>
            <p style={{ color: '#AAA', marginBottom: '10px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
              Try different mode:
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', 
              gap: 'clamp(5px, 1.5vw, 10px)' 
            }}>
              {['easy', 'medium', 'hard'].map((diff) => {
                const diffSettings = DIFFICULTY_SETTINGS[diff];
                return (
                  <button
                    key={diff}
                    onClick={() => startGame(diff)}
                    style={{
                      padding: 'clamp(8px, 2vw, 12px)',
                      border: 'none',
                      borderRadius: '30px',
                      background: `linear-gradient(135deg, ${diffSettings.color}, ${diffSettings.secondaryColor})`,
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: 'clamp(12px, 2.5vw, 14px)',
                      fontWeight: 'bold',
                      boxShadow: '0 5px 10px rgba(0,0,0,0.3)',
                    }}
                  >
                    {diffSettings.icon} {diffSettings.name.split(' ')[1]}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Stats summary */}
          <div style={{
            marginTop: 'clamp(15px, 4vw, 20px)',
            fontSize: 'clamp(12px, 2.5vw, 14px)',
            color: '#666',
          }}>
            🎮 Total games: {stats.gamesPlayed} | 💫 Power-ups: {stats.powerUpsCollected}
          </div>
        </div>
      )}

      {/* In-game UI */}
      {gameStarted && !gameOver && (
        <>
          {/* Control buttons - responsive positioning */}
          <div style={{
            position: 'absolute',
            top: 'clamp(10px, 3vh, 20px)',
            right: 'clamp(10px, 3vw, 20px)',
            display: 'flex',
            gap: 'clamp(5px, 1.5vw, 10px)',
            zIndex: 10,
          }}>
            <button
              onClick={toggleSound}
              style={{
                width: 'clamp(40px, 8vw, 60px)',
                height: 'clamp(40px, 8vw, 60px)',
                fontSize: 'clamp(20px, 4vw, 28px)',
                background: 'rgba(255,255,255,0.9)',
                border: `3px solid ${settings.color}`,
                borderRadius: '50%',
                boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {soundOn ? '🔊' : '🔈'}
            </button>
            
            <button
              onClick={toggleVibration}
              style={{
                width: 'clamp(40px, 8vw, 60px)',
                height: 'clamp(40px, 8vw, 60px)',
                fontSize: 'clamp(20px, 4vw, 28px)',
                background: 'rgba(255,255,255,0.9)',
                border: `3px solid ${settings.color}`,
                borderRadius: '50%',
                boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {vibration ? '📳' : '📴'}
            </button>
          </div>

          {/* Pause button */}
          <button
            onClick={() => setGamePaused(!gamePaused)}
            style={{
              position: 'absolute',
              top: 'clamp(10px, 3vh, 20px)',
              left: 'clamp(10px, 3vw, 20px)',
              width: 'clamp(40px, 8vw, 60px)',
              height: 'clamp(40px, 8vw, 60px)',
              fontSize: 'clamp(20px, 4vw, 28px)',
              background: 'rgba(255,255,255,0.9)',
              border: `3px solid ${settings.color}`,
              borderRadius: '50%',
              boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {gamePaused ? '▶' : '⏸'}
          </button>

          {/* Power-up indicator */}
          {timeScale !== 1 && (
            <div style={{
              position: 'absolute',
              bottom: 'clamp(60px, 10vh, 80px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(52, 152, 219, 0.9)',
              color: 'white',
              padding: 'clamp(8px, 2vh, 12px) clamp(15px, 3vw, 25px)',
              borderRadius: '50px',
              fontSize: 'clamp(14px, 3vw, 18px)',
              fontWeight: 'bold',
              border: '3px solid white',
              boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
              zIndex: 10,
              animation: 'pulse 1s ease-in-out infinite',
            }}>
              {timeScale < 1 ? '⏰ SLOW MOTION' : '⚡ SPEED BOOST'}
            </div>
          )}

          {/* Menu button */}
          <button
            onClick={quitToMenu}
            style={{
              position: 'absolute',
              bottom: 'clamp(10px, 3vh, 20px)',
              right: 'clamp(10px, 3vw, 20px)',
              padding: 'clamp(8px, 2vh, 12px) clamp(15px, 4vw, 25px)',
              fontSize: 'clamp(14px, 3vw, 16px)',
              background: 'rgba(255,255,255,0.9)',
              border: `3px solid ${settings.color}`,
              borderRadius: '40px',
              boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              zIndex: 10,
              fontWeight: 'bold',
              color: settings.textColor,
            }}
          >
            🏠 MENU
          </button>
        </>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-20px); }
        }
        @keyframes pulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.05); }
        }
      `}</style>
    </div>
  );
}