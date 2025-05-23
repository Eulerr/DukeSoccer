// Player data
const players = [
    'Arshvir Sidhu',
    'Blake Thompson',
    'Carter Randhawa',
    'Cohen Brown-Lallouz',
    'Connor Peterson',
    'Deacon James',
    'Duke Lipton',
    'Emmitt Bruening',
    'Ezra Sadovnick',
    'Gavin Gillies',
    'Levi Butler',
    'Liev Lee',
    'Marcel Agumagu',
    'Nathan Lee',
    'Nikos Neofotis',
    'Oliver Werner',
    'Sebastian Bombard'
];

// Players who cannot play defense
const nonDefensePlayers = ['Cohen Brown-Lallouz', 'Deacon James', 'Liev Lee'];

// Game state
const gameState = {
    attendance: {},
    positions: {},
    subsUsed: 0,
    totalSubs: 9,
    currentSubGroup: 0,
    subGroups: [],
    attendanceConfirmed: false,
    currentGoalie: null,
    lastSubGroup: [], // Track the last group of players who were on the field
    availablePlayers: [], // Track available players for rotation
    playerPlayTime: {}, // Track how many times each player has been on the field
    allSubGroups: [], // Track all previous substitution groups
    nextSubPositions: null // Store the next substitution positions
};

// Initialize the application
function init() {
    setupAttendanceGrid();
    setupEventListeners();
    // Initialize play time tracking
    players.forEach(player => {
        gameState.playerPlayTime[player] = 0;
    });
}

// Set up the attendance grid
function setupAttendanceGrid() {
    const attendanceGrid = document.querySelector('.attendance-grid');
    players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'attendance-item';
        div.innerHTML = `
            <input type="checkbox" id="attendance-${player}" data-player="${player}" checked>
            <label for="attendance-${player}">${player}</label>
        `;
        attendanceGrid.appendChild(div);
        
        // Set initial attendance
        gameState.attendance[player] = true;
    });

    // Ensure sections are hidden initially
    document.getElementById('field-display').style.display = 'none';
    document.getElementById('substitution-controls').style.display = 'none';
    document.getElementById('position-table').style.display = 'none';
}

// Set up event listeners
function setupEventListeners() {
    // Check All button
    document.getElementById('check-all').addEventListener('click', () => {
        document.querySelectorAll('.attendance-item input').forEach(checkbox => {
            checkbox.checked = true;
            gameState.attendance[checkbox.dataset.player] = true;
        });
        if (gameState.attendanceConfirmed) {
            document.getElementById('update-attendance').style.display = 'inline-block';
        }
    });

    // Uncheck All button
    document.getElementById('uncheck-all').addEventListener('click', () => {
        document.querySelectorAll('.attendance-item input').forEach(checkbox => {
            checkbox.checked = false;
            gameState.attendance[checkbox.dataset.player] = false;
        });
        if (gameState.attendanceConfirmed) {
            document.getElementById('update-attendance').style.display = 'inline-block';
        }
        // Hide sections if we uncheck all
        document.getElementById('field-display').style.display = 'none';
        document.getElementById('substitution-controls').style.display = 'none';
        document.getElementById('position-table').style.display = 'none';
    });

    // Attendance checkboxes
    document.querySelectorAll('.attendance-item input').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const player = e.target.dataset.player;
            gameState.attendance[player] = e.target.checked;
            if (gameState.attendanceConfirmed) {
                document.getElementById('update-attendance').style.display = 'inline-block';
            }
            // Check if we have enough players after this change
            const presentPlayers = getPresentPlayers();
            if (presentPlayers.length < 9) {
                document.getElementById('field-display').style.display = 'none';
                document.getElementById('substitution-controls').style.display = 'none';
                document.getElementById('position-table').style.display = 'none';
            }
        });
    });

    // Confirm attendance button
    document.getElementById('confirm-attendance').addEventListener('click', () => {
        const presentPlayers = getPresentPlayers();
        if (presentPlayers.length < 9) {
            alert('Need at least 9 players present to start!');
            return;
        }
        confirmAttendance();
    });

    // Update attendance button
    document.getElementById('update-attendance').addEventListener('click', () => {
        const presentPlayers = getPresentPlayers();
        if (presentPlayers.length < 9) {
            alert('Need at least 9 players present to continue!');
            return;
        }
        updateAttendance();
    });

    // Next sub button
    document.getElementById('next-sub').addEventListener('click', handleNextSub);

    // Add extra sub button
    document.getElementById('add-extra-sub').addEventListener('click', () => {
        gameState.totalSubs++;
        updateSubCount();
    });
}

// Confirm attendance and initialize positions
function confirmAttendance() {
    const presentPlayers = getPresentPlayers();
    if (presentPlayers.length < 9) {
        alert('Need at least 9 players present to start!');
        return;
    }

    gameState.attendanceConfirmed = true;
    document.getElementById('confirm-attendance').style.display = 'none';
    document.getElementById('update-attendance').style.display = 'inline-block';
    
    // Show field display and position table
    document.getElementById('field-display').style.display = 'block';
    document.getElementById('substitution-controls').style.display = 'block';
    document.getElementById('position-table').style.display = 'block';
    
    // Initialize available players
    gameState.availablePlayers = [...presentPlayers];
    gameState.lastSubGroup = [];
    
    // Initialize positions
    const initialPositions = assignPositions(presentPlayers);
    updateFieldDisplayWithPositions(initialPositions);
    updatePositionTableWithPositions(initialPositions);
    
    // Show initial sub preview
    gameState.nextSubPositions = calculateNextSubPositions(initialPositions);
    updateSubPreview(initialPositions, gameState.nextSubPositions);
}

// Handle next substitution
function handleNextSub() {
    if (gameState.subsUsed >= gameState.totalSubs) {
        alert('Maximum number of substitutions reached!');
        return;
    }

    const presentPlayers = getPresentPlayers();
    if (presentPlayers.length < 9) {
        alert('Not enough players present for substitution! Need at least 9 players.');
        // Hide sections if not enough players
        document.getElementById('field-display').style.display = 'none';
        document.getElementById('substitution-controls').style.display = 'none';
        document.getElementById('position-table').style.display = 'none';
        return;
    }

    // Get current positions
    const currentPositions = {};
    document.querySelectorAll('.position').forEach(pos => {
        const position = pos.dataset.position;
        const playerNameElement = pos.querySelector('.player-name');
        if (playerNameElement) {
            currentPositions[position] = playerNameElement.textContent;
        }
    });

    // Use the stored next sub positions
    const newPositions = gameState.nextSubPositions;
    
    // Update play time for all players in this sub group
    Object.values(newPositions).forEach(player => {
        if (player) {
            gameState.playerPlayTime[player]++;
        }
    });
    
    // Update the game state
    gameState.lastSubGroup = Object.values(newPositions);
    gameState.currentGoalie = newPositions.goalie;
    gameState.allSubGroups.push([...gameState.lastSubGroup]);
    gameState.subsUsed++;
    
    // Update the display
    updateSubCount();
    updateFieldDisplayWithPositions(newPositions);
    updatePositionTableWithPositions(newPositions);
    
    // Calculate and show next sub preview
    gameState.nextSubPositions = calculateNextSubPositions(newPositions);
    updateSubPreview(newPositions, gameState.nextSubPositions);
}

// Calculate next substitution positions
function calculateNextSubPositions(currentPositions) {
    const presentPlayers = getPresentPlayers();
    let availablePlayers = presentPlayers.filter(p => !Object.values(currentPositions).includes(p));
    
    // If we don't have enough players to rotate, we need to use some players again
    if (availablePlayers.length < 9) {
        // Sort players by play time
        const sortedPlayers = [...presentPlayers].sort((a, b) => 
            gameState.playerPlayTime[a] - gameState.playerPlayTime[b]
        );
        
        // Take the players who have played the least
        availablePlayers = sortedPlayers.slice(0, 9);
    }

    // Shuffle available players multiple times for better randomization
    for (let i = 0; i < 3; i++) {
        availablePlayers = shuffleArray(availablePlayers);
    }
    
    // Create new positions object
    const newPositions = {};
    
    // Check if goalie should be included in substitution
    const includeGoalie = document.getElementById('include-goalie-sub').checked;
    
    if (includeGoalie) {
        // Get all eligible goalies and randomly select one
        const eligibleGoalies = availablePlayers.filter(p => !nonDefensePlayers.includes(p));
        const shuffledGoalies = shuffleArray([...eligibleGoalies]);
        newPositions.goalie = shuffledGoalies[0];
        availablePlayers = availablePlayers.filter(p => p !== newPositions.goalie);
    } else {
        // Keep current goalie if checkbox is not checked
        newPositions.goalie = currentPositions.goalie;
    }
    
    // Shuffle remaining players for random position assignment
    availablePlayers = shuffleArray(availablePlayers);
    
    // Assign positions, maintaining positions for players who are staying
    const positionOrder = [
        'forward-left', 'forward-center', 'forward-right',
        'midfield-left', 'midfield-right',
        'defense-left', 'defense-center', 'defense-right'
    ];

    positionOrder.forEach(position => {
        const currentPlayer = currentPositions[position];
        if (availablePlayers.includes(currentPlayer)) {
            // Player is available and can stay in their position
            newPositions[position] = currentPlayer;
            availablePlayers = availablePlayers.filter(p => p !== currentPlayer);
        } else {
            // Need to assign a new player to this position
            const eligiblePlayers = availablePlayers.filter(p => {
                if (position.startsWith('defense') && nonDefensePlayers.includes(p)) {
                    return false;
                }
                return true;
            });
            if (eligiblePlayers.length > 0) {
                newPositions[position] = eligiblePlayers[0];
                availablePlayers = availablePlayers.filter(p => p !== eligiblePlayers[0]);
            }
        }
    });
    
    return newPositions;
}

// Update substitution preview
function updateSubPreview(currentPositions, newPositions) {
    const previewGrid = document.querySelector('.sub-preview-grid');
    previewGrid.innerHTML = '';
    
    const positionLabels = {
        'goalie': 'Goalie',
        'forward-left': 'Forward Left',
        'forward-center': 'Forward Center',
        'forward-right': 'Forward Right',
        'midfield-left': 'Midfield Left',
        'midfield-right': 'Midfield Right',
        'defense-left': 'Defense Left',
        'defense-center': 'Defense Center',
        'defense-right': 'Defense Right'
    };

    Object.entries(positionLabels).forEach(([position, label]) => {
        const currentPlayer = currentPositions[position];
        const newPlayer = newPositions[position];
        
        if (currentPlayer !== newPlayer) {
            const div = document.createElement('div');
            div.className = 'sub-preview-item';
            div.innerHTML = `
                <span class="position">${label}</span>
                <span class="player">${currentPlayer}</span>
                <span class="arrow">→</span>
                <span class="new-player">${newPlayer}</span>
            `;
            previewGrid.appendChild(div);
        } else {
            const div = document.createElement('div');
            div.className = 'sub-preview-item';
            div.innerHTML = `
                <span class="position">${label}</span>
                <span class="staying">${currentPlayer} (staying)</span>
            `;
            previewGrid.appendChild(div);
        }
    });

    // Show the preview section
    document.getElementById('sub-preview').style.display = 'block';
}

// Helper function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Update field display with specific positions
function updateFieldDisplayWithPositions(positions) {
    Object.entries(positions).forEach(([position, player]) => {
        const positionElement = document.querySelector(`[data-position="${position}"] .player-name`);
        if (positionElement) {
            positionElement.textContent = player;
        }
    });
}

// Update position table with specific positions
function updatePositionTableWithPositions(positions) {
    const tbody = document.querySelector('#positions-table tbody');
    tbody.innerHTML = '';
    
    const positionLabels = {
        'goalie': 'Goalie',
        'forward-left': 'Forward Left',
        'forward-center': 'Forward Center',
        'forward-right': 'Forward Right',
        'midfield-left': 'Midfield Left',
        'midfield-right': 'Midfield Right',
        'defense-left': 'Defense Left',
        'defense-center': 'Defense Center',
        'defense-right': 'Defense Right'
    };
    
    Object.entries(positionLabels).forEach(([position, label]) => {
        const tr = document.createElement('tr');
        const player = positions[position];
        const playTime = player ? gameState.playerPlayTime[player] : 0;
        tr.innerHTML = `
            <td>${label}</td>
            <td>${player || ''} (${playTime} subs)</td>
        `;
        tbody.appendChild(tr);
    });
}

// Get list of present players
function getPresentPlayers() {
    return players.filter(player => {
        const checkbox = document.getElementById(`attendance-${player}`);
        return checkbox && checkbox.checked;
    });
}

// Update field display
function updateFieldDisplay() {
    const presentPlayers = getPresentPlayers();
    if (presentPlayers.length < 9) {
        // Hide field display if not enough players
        document.getElementById('field-display').style.display = 'none';
        document.getElementById('substitution-controls').style.display = 'none';
        document.getElementById('position-table').style.display = 'none';
        return;
    }

    // Show the sections if we have enough players
    document.getElementById('field-display').style.display = 'block';
    document.getElementById('substitution-controls').style.display = 'block';
    document.getElementById('position-table').style.display = 'block';

    const positions = assignPositions(presentPlayers);
    updateFieldDisplayWithPositions(positions);
}

// Assign positions to players
function assignPositions(presentPlayers) {
    const positions = {};
    
    // If this is the first assignment or after attendance update
    if (!gameState.lastSubGroup.length) {
        // Get all eligible goalies and randomly select one
        const eligibleGoalies = presentPlayers.filter(p => !nonDefensePlayers.includes(p));
        const shuffledGoalies = shuffleArray([...eligibleGoalies]);
        gameState.currentGoalie = shuffledGoalies[0];
    } else {
        // For substitutions, rotate all players
        const availablePlayers = presentPlayers.filter(p => !gameState.lastSubGroup.includes(p));
        
        // If we don't have enough players to rotate, reset the last sub group
        if (availablePlayers.length < 9) {
            gameState.lastSubGroup = [];
            return assignPositions(presentPlayers);
        }
        
        // Randomly select new goalie from available players
        const eligibleGoalies = availablePlayers.filter(p => !nonDefensePlayers.includes(p));
        const shuffledGoalies = shuffleArray([...eligibleGoalies]);
        gameState.currentGoalie = shuffledGoalies[0];
    }
    
    // Remove goalie from available players
    const remainingPlayers = presentPlayers.filter(p => p !== gameState.currentGoalie);
    positions.goalie = gameState.currentGoalie;
    
    // Shuffle remaining players for random position assignment
    const shuffledPlayers = shuffleArray([...remainingPlayers]);
    
    // Assign forwards (prioritize non-defense players)
    const forwardPlayers = shuffledPlayers.filter(p => nonDefensePlayers.includes(p));
    const otherPlayers = shuffledPlayers.filter(p => !nonDefensePlayers.includes(p));
    
    // Shuffle forward and other players separately
    const shuffledForwards = shuffleArray([...forwardPlayers]);
    const shuffledOthers = shuffleArray([...otherPlayers]);
    
    positions['forward-left'] = shuffledForwards[0] || shuffledOthers[0];
    positions['forward-center'] = shuffledForwards[1] || shuffledOthers[1];
    positions['forward-right'] = shuffledForwards[2] || shuffledOthers[2];
    
    // Remove assigned forwards
    const assignedForwards = [positions['forward-left'], positions['forward-center'], positions['forward-right']];
    const remainingAfterForwards = shuffledOthers.filter(p => !assignedForwards.includes(p));
    
    // Shuffle remaining players again
    const shuffledRemaining = shuffleArray([...remainingAfterForwards]);
    
    // Assign midfield
    positions['midfield-left'] = shuffledRemaining[0];
    positions['midfield-right'] = shuffledRemaining[1];
    
    // Assign defense (excluding non-defense players)
    const defensePlayers = shuffledRemaining.slice(2).filter(p => !nonDefensePlayers.includes(p));
    const shuffledDefense = shuffleArray([...defensePlayers]);
    positions['defense-left'] = shuffledDefense[0];
    positions['defense-center'] = shuffledDefense[1];
    positions['defense-right'] = shuffledDefense[2];
    
    // Update last sub group
    gameState.lastSubGroup = Object.values(positions);
    
    return positions;
}

// Update position table
function updatePositionTable() {
    const tbody = document.querySelector('#positions-table tbody');
    tbody.innerHTML = '';
    
    const positions = {
        'Goalie': 'goalie',
        'Forward Left': 'forward-left',
        'Forward Center': 'forward-center',
        'Forward Right': 'forward-right',
        'Midfield Left': 'midfield-left',
        'Midfield Right': 'midfield-right',
        'Defense Left': 'defense-left',
        'Defense Center': 'defense-center',
        'Defense Right': 'defense-right'
    };
    
    Object.entries(positions).forEach(([label, position]) => {
        const tr = document.createElement('tr');
        const positionElement = document.querySelector(`[data-position="${position}"] .player-name`);
        tr.innerHTML = `
            <td>${label}</td>
            <td>${positionElement ? positionElement.textContent : ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Update sub count display
function updateSubCount() {
    document.getElementById('subs-used').textContent = gameState.subsUsed;
    document.getElementById('total-subs').textContent = gameState.totalSubs;
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
