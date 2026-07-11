// Web Audio Context for synthesized sound effects
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Synthesize a lotto ball pop sound
function playPopSound() {
    try {
        initAudio();
        if (!audioCtx) return;
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        // Pitch starts higher and quickly drops (like a pop/bubble sound)
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.16);
    } catch (e) {
        console.error('Audio playback failed:', e);
    }
}

// Synthesize a pleasant success chime chord when all numbers are drawn
function playChimeSound() {
    try {
        initAudio();
        if (!audioCtx) return;
        
        const now = audioCtx.currentTime;
        // Major 7th chord: C4, E4, G4, B4
        const notes = [261.63, 329.63, 392.00, 493.88, 523.25]; // C4, E4, G4, B4, C5
        
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08); // Arpeggiated
            
            gainNode.gain.setValueAtTime(0, now + idx * 0.08);
            gainNode.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);
            
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.65);
        });
    } catch (e) {
        console.error('Audio playback failed:', e);
    }
}

// State Management
const state = {
    fixedNumbers: new Set(),
    excludedNumbers: new Set(),
    isDrawing: false,
    history: JSON.parse(localStorage.getItem('lotto_history') || '[]')
};

// DOM Elements
const ballDisplay = document.getElementById('ballDisplay');
const btnGenerate = document.getElementById('btnGenerate');
const btnClear = document.getElementById('btnClear');
const optionsToggle = document.getElementById('optionsToggle');
const optionsContent = document.getElementById('optionsContent');
const optionsIcon = document.getElementById('optionsIcon');
const numberSelector = document.getElementById('numberSelector');
const historyList = document.getElementById('historyList');
const btnClearHistory = document.getElementById('btnClearHistory');

// Stats Elements
const statOddEven = document.getElementById('statOddEven');
const statSum = document.getElementById('statSum');
const statHighLow = document.getElementById('statHighLow');

// Create Number Selection Grid (1-45)
function createSelectorGrid() {
    numberSelector.innerHTML = '';
    for (let i = 1; i <= 45; i++) {
        const cell = document.createElement('div');
        cell.className = 'num-cell';
        cell.textContent = i;
        cell.dataset.num = i;
        
        cell.addEventListener('click', () => {
            if (state.isDrawing) return;
            handleNumCellClick(cell, i);
        });
        
        numberSelector.appendChild(cell);
    }
}

// Cycle states: Normal -> Fixed (Included) -> Excluded -> Normal
function handleNumCellClick(cell, num) {
    if (state.fixedNumbers.has(num)) {
        // Switch from Fixed to Excluded
        state.fixedNumbers.delete(num);
        state.excludedNumbers.add(num);
        cell.classList.remove('fixed');
        cell.classList.add('excluded');
    } else if (state.excludedNumbers.has(num)) {
        // Switch from Excluded to Normal
        state.excludedNumbers.delete(num);
        cell.classList.remove('excluded');
    } else {
        // Switch from Normal to Fixed
        // Validation: Max 5 fixed numbers
        if (state.fixedNumbers.size >= 5) {
            alert('고정수는 최대 5개까지만 선택할 수 있습니다.');
            return;
        }
        state.fixedNumbers.add(num);
        cell.classList.add('fixed');
    }
}

// Reset number grids
function resetGridStates() {
    state.fixedNumbers.clear();
    state.excludedNumbers.clear();
    document.querySelectorAll('.num-cell').forEach(cell => {
        cell.className = 'num-cell';
    });
}

// Toggle Options Panel
optionsToggle.addEventListener('click', () => {
    const isOpen = optionsContent.classList.toggle('open');
    if (isOpen) {
        optionsIcon.classList.add('rotated');
    } else {
        optionsIcon.classList.remove('rotated');
    }
});

// Get correct class for lotto ball color based on number ranges
// 1-10: Yellow, 11-20: Blue, 21-30: Red, 31-40: Gray, 41-45: Green
function getBallColorClass(num) {
    if (num <= 10) return 'ball-num-1';
    if (num <= 20) return 'ball-num-2';
    if (num <= 30) return 'ball-num-3';
    if (num <= 40) return 'ball-num-4';
    return 'ball-num-5';
}

// Render generated balls into the display area one by one
function createBallElement(num, isBonus = false) {
    const ball = document.createElement('div');
    ball.className = `lotto-ball ${getBallColorClass(num)}`;
    ball.textContent = num;
    return ball;
}

// Draw Lotto Numbers
async function drawLottoNumbers() {
    if (state.isDrawing) return;
    
    // Check validation: total available numbers must be at least 6 main + 1 bonus = 7 numbers
    const availablePool = [];
    for (let i = 1; i <= 45; i++) {
        if (!state.excludedNumbers.has(i) && !state.fixedNumbers.has(i)) {
            availablePool.push(i);
        }
    }
    
    const requiredRandomCount = 6 - state.fixedNumbers.size;
    // We need requiredRandomCount + 1 (for bonus number)
    const totalNeededFromPool = requiredRandomCount + 1;
    
    if (availablePool.length < totalNeededFromPool) {
        alert(`제외수가 너무 많아 번호를 생성할 수 없습니다.\n사용 가능한 번호가 최소 ${totalNeededFromPool}개 필요합니다.`);
        return;
    }
    
    state.isDrawing = true;
    btnGenerate.disabled = true;
    btnGenerate.style.opacity = '0.6';
    
    // UI effects
    ballDisplay.parentElement.classList.add('drawing-active');
    ballDisplay.innerHTML = '';
    
    // 1. Prepare Main Numbers (6)
    // Start with fixed numbers
    const mainNumbers = Array.from(state.fixedNumbers);
    
    // Shuffle available pool to pick random ones
    const shuffledPool = [...availablePool].sort(() => Math.random() - 0.5);
    
    // Pick the remaining numbers for main numbers
    for (let i = 0; i < requiredRandomCount; i++) {
        mainNumbers.push(shuffledPool.pop());
    }
    
    // Main numbers should be sorted ascending
    mainNumbers.sort((a, b) => a - b);
    
    // Pick 1 bonus number from what remains in the shuffled pool
    const bonusNumber = shuffledPool.pop();
    
    // 2. Render balls one by one with a cool pop animation and sound
    const drawSequence = [...mainNumbers];
    
    for (let i = 0; i < drawSequence.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 350));
        const ball = createBallElement(drawSequence[i]);
        ballDisplay.appendChild(ball);
        playPopSound();
    }
    
    // Draw Bonus Ball
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const separator = document.createElement('div');
    separator.className = 'bonus-separator';
    separator.innerHTML = `<span>+</span><span class="bonus-label">보너스</span>`;
    ballDisplay.appendChild(separator);
    
    await new Promise(resolve => setTimeout(resolve, 350));
    const bonusBall = createBallElement(bonusNumber, true);
    ballDisplay.appendChild(bonusBall);
    playPopSound();
    
    // Play final success sound
    await new Promise(resolve => setTimeout(resolve, 200));
    playChimeSound();
    
    // Update Stats
    updateStatistics(mainNumbers);
    
    // Save to History
    saveToHistory(mainNumbers, bonusNumber);
    
    // Cleanup state
    state.isDrawing = false;
    btnGenerate.disabled = false;
    btnGenerate.style.opacity = '1';
    ballDisplay.parentElement.classList.remove('drawing-active');
}

// Calculate and render stats
function updateStatistics(numbers) {
    // 1. Sum
    const sum = numbers.reduce((a, b) => a + b, 0);
    statSum.textContent = sum;
    
    // 2. Odd : Even
    const odds = numbers.filter(n => n % 2 !== 0).length;
    const evens = 6 - odds;
    statOddEven.textContent = `${odds} : ${evens}`;
    
    // 3. High (23-45) : Low (1-22)
    const highs = numbers.filter(n => n >= 23).length;
    const lows = 6 - highs;
    statHighLow.textContent = `${highs} : ${lows}`;
}

// Save draw history to localStorage
function saveToHistory(mainNumbers, bonusNumber) {
    const record = {
        id: Date.now(),
        date: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        numbers: mainNumbers,
        bonus: bonusNumber
    };
    
    state.history.unshift(record);
    // Keep max 50 items
    if (state.history.length > 50) {
        state.history.pop();
    }
    
    localStorage.setItem('lotto_history', JSON.stringify(state.history));
    renderHistory();
}

// Render history records
function renderHistory() {
    historyList.innerHTML = '';
    
    if (state.history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">아직 생성된 번호가 없습니다.</div>';
        return;
    }
    
    state.history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'history-time';
        timeSpan.textContent = item.date;
        
        const ballsDiv = document.createElement('div');
        ballsDiv.className = 'history-balls';
        
        item.numbers.forEach(num => {
            const ball = document.createElement('div');
            ball.className = `history-ball ${getBallColorClass(num)}`;
            ball.textContent = num;
            ballsDiv.appendChild(ball);
        });
        
        // Plus separator
        const separator = document.createElement('div');
        separator.style.cssText = 'color: var(--text-muted); font-weight: 700; margin: 0 4px; display: flex; align-items: center;';
        separator.textContent = '+';
        ballsDiv.appendChild(separator);
        
        // Bonus ball
        const bonusBall = document.createElement('div');
        bonusBall.className = `history-ball ${getBallColorClass(item.bonus)}`;
        bonusBall.textContent = item.bonus;
        ballsDiv.appendChild(bonusBall);
        
        historyItem.appendChild(timeSpan);
        historyItem.appendChild(ballsDiv);
        
        historyList.appendChild(historyItem);
    });
}

// Clear drawn state
function clearDrawnBalls() {
    if (state.isDrawing) return;
    ballDisplay.innerHTML = `
        <div style="color: var(--text-muted); font-style: italic; font-weight: 300;">
            번호 생성 버튼을 눌러주세요.
        </div>
    `;
    statSum.textContent = '-';
    statOddEven.textContent = '-';
    statHighLow.textContent = '-';
}

// Clear History
btnClearHistory.addEventListener('click', () => {
    if (confirm('모든 생성 기록을 삭제하시겠습니까?')) {
        state.history = [];
        localStorage.removeItem('lotto_history');
        renderHistory();
    }
});

// Event Listeners
btnGenerate.addEventListener('click', drawLottoNumbers);
btnClear.addEventListener('click', () => {
    clearDrawnBalls();
    resetGridStates();
});

// Initialization
createSelectorGrid();
renderHistory();
clearDrawnBalls();
