let questionsData = {};

const categories = {
    Science: [],
    History: [],
    Technology: [],
    Sports: []
};

let userProgress = {
    Science: { correct: 0, incorrect: 0, mistakes: [], answered: [], xp: 0, level: 1 },
    History: { correct: 0, incorrect: 0, mistakes: [], answered: [], xp: 0, level: 1 },
    Technology: { correct: 0, incorrect: 0, mistakes: [], answered: [], xp: 0, level: 1 },
    Sports: { correct: 0, incorrect: 0, mistakes: [], answered: [], xp: 0, level: 1 }
};

let currentUser = null;
// Global variable to store the currently active question
let currentQuestion = null;

// Calculates global rank based on global XP (every 100 xp = rank up)
function getGlobalRank(xp) {
    const ranks = [
        "Rookie",
        "Apprentice",
        "Adept",
        "Skilled",
        "Proficient",
        "Expert",
        "Master",
        "Grandmaster",
        "Legend",
        "Mythic",
        "Celestial",
        "Cosmic",
        "Ethereal",
        "Transcendent",
        "Omnipotent"
    ];
    const index = Math.floor(xp / 100);
    return index >= ranks.length ? ranks[ranks.length - 1] : ranks[index];
}

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            console.error('Error fetching questions:', response.status);
            return;
        }
        questionsData = await response.json();
        console.log('Questions loaded from questions.json');
        for (const category in questionsData) {
            for (const difficulty in questionsData[category]) {
                // Add a difficulty property for each question
                const questionsWithDiff = questionsData[category][difficulty].map(q => {
                    q.difficulty = difficulty;
                    return q;
                });
                categories[category].push(...questionsWithDiff);
            }
        }
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

function showMainMenu() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="text-center">
            <h2 class="text-2xl font-bold mb-4">Welcome to BrainMate</h2>
            <p class="mb-4">Select an option below to get started:</p>
        </div>
    `;
    showButtons();
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const storedPassword = localStorage.getItem(username);
    if (storedPassword && storedPassword === password) {
        currentUser = username;
        showMainMenu();
    } else {
        alert('Invalid username or password');
    }
}

function showButtons() {
    const buttons = document.getElementById('buttons');
    buttons.innerHTML = `
        <div class="text-center py-2 cursor-pointer text-white rounded-lg bg-blue-500 shadow-lg transform transition-transform duration-200 hover:scale-105 hover:shadow-xl mb-2" onclick="showTrivia()">Trivia Game</div>
        <div class="text-center py-2 cursor-pointer text-white rounded-lg bg-blue-500 shadow-lg transform transition-transform duration-200 hover:scale-105 hover:shadow-xl" onclick="showScroll()">Scroll Section</div>
        <div class="text-center py-2 cursor-pointer text-white rounded-lg bg-red-500 shadow-lg transform transition-transform duration-200 hover:scale-105 hover:shadow-xl" onclick="logout()">Logout</div>
    `;
}

async function showTrivia() {
    if (Object.keys(categories).every(category => categories[category].length > 0)) {
        showCategories();
    } else {
        await loadQuestions();
        showCategories();
    }
}

function showCategories() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="text-center">
            <h2 class="text-2xl font-bold mb-4">Select a Quiz Category</h2>
            <button class="w-full py-2 mb-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600" onclick="startQuiz('Science')">Science</button>
            <button class="w-full py-2 mb-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600" onclick="startQuiz('History')">History</button>
            <button class="w-full py-2 mb-2 bg-purple-500 text-white rounded-lg shadow-lg hover:bg-purple-600" onclick="startQuiz('Technology')">Technology</button>
            <button class="w-full py-2 mb-2 bg-yellow-500 text-white rounded-lg shadow-lg hover:bg-yellow-600" onclick="startQuiz('Sports')">Sports</button>
        </div>
    `;
    showXPLevel();
}

// Maps the user's level to a difficulty
function getDesiredDifficulty(category) {
    const level = userProgress[category].level;
    if (level === 1) return 'easy';
    else if (level === 2) return 'medium';
    else return 'hard';
}

function showXPLevel() {
    let xpLevel = document.getElementById('xp-level');
    if (!xpLevel) {
        xpLevel = document.createElement('div');
        xpLevel.id = 'xp-level';
        xpLevel.className = 'absolute top-0 right-0 m-4 p-2 bg-gray-800 text-white rounded-lg shadow-lg';
        document.body.appendChild(xpLevel);
    }
    let globalXp = 0;
    let xpDetails = "";
    Object.keys(userProgress).forEach(category => {
        let xp = userProgress[category].xp;
        let level = userProgress[category].level;
        let difficulty = getDesiredDifficulty(category);
        globalXp += xp;
        xpDetails += `<div>${category}: XP: ${xp} | Level: ${level} (${difficulty})</div>`;
    });
    const globalRank = getGlobalRank(globalXp);
    xpLevel.innerHTML = `<div>Global XP: ${globalXp} | Rank: ${globalRank}</div>${xpDetails}`;
}

function startQuiz(category) {
    const questions = prioritizeQuestions(category);
    if (questions.length === 0) {
        alert('No questions available for this category.');
        return;
    }
    // Pick a random question from the pool
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    currentQuestion = randomQuestion;
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="text-center">
            <h2 class="text-2xl font-bold mb-4">${category} Quiz</h2>
            <p class="mb-4">${randomQuestion.question}</p>
            ${randomQuestion.options.map(option => `<button class="w-full py-2 mb-2 bg-gray-200 text-gray-800 rounded-lg shadow-lg hover:bg-gray-300" onclick='checkAnswer(${JSON.stringify(category)}, ${JSON.stringify(option)})'>${option}</button>`).join('')}
        </div>
    `;
    showXPLevel();
}

// Update prioritizeQuestions to return questions based on level and filtering out correctly answered ones.
function prioritizeQuestions(category) {
    const progress = userProgress[category];
    const answeredQuestions = progress.answered.map(q => q.question);
    let pool = [];
    // For level 1: only use easy questions not answered correctly.
    if (progress.level === 1) {
        pool = categories[category].filter(q => q.difficulty === 'easy' && !answeredQuestions.includes(q.question));
        // Duplicate any mistake from easy to weight them.
        let frequency = {};
        progress.mistakes.filter(q => q.difficulty === 'easy').forEach(q => {
            const key = q.question;
            frequency[key] = (frequency[key] || 0) + 1;
        });
        let weightedMistakes = [];
        for (const key in frequency) {
            const questionObj = progress.mistakes.find(q => q.question === key);
            for (let i = 0; i < frequency[key]; i++) {
                weightedMistakes.push(questionObj);
            }
        }
        // Combine weighted mistakes with remaining pool (avoid duplicating mistakes).
        const remainingPool = pool.filter(q => !weightedMistakes.some(m => m.question === q.question));
        pool = [...weightedMistakes, ...remainingPool];
    } else {
        // For level 2 and above, include easy questions (mistakes and unanswered) and medium questions.
        let poolEasy = categories[category].filter(q => q.difficulty === 'easy' && !answeredQuestions.includes(q.question));
        let poolMedium = categories[category].filter(q => q.difficulty === 'medium' && !answeredQuestions.includes(q.question));

        // Weight mistakes in easy questions.
        let frequency = {};
        progress.mistakes.filter(q => q.difficulty === 'easy').forEach(q => {
            const key = q.question;
            frequency[key] = (frequency[key] || 0) + 1;
        });
        let weightedMistakes = [];
        for (const key in frequency) {
            const questionObj = progress.mistakes.find(q => q.question === key);
            for (let i = 0; i < frequency[key]; i++) {
                weightedMistakes.push(questionObj);
            }
        }
        // For poolEasy, remove duplicates of weighted mistakes.
        const remainingPoolEasy = poolEasy.filter(q => !weightedMistakes.some(m => m.question === q.question));
        pool = [...weightedMistakes, ...remainingPoolEasy, ...poolMedium];
    }
    return pool;
}

function checkAnswer(category, selectedOption) {
    const content = document.getElementById('content');
    if (!currentQuestion) {
        console.error('No current question set.');
        alert('An error occurred. Please try again.');
        return;
    }
    if (selectedOption === currentQuestion.answer) {
        userProgress[category].correct++;
        userProgress[category].xp += 10;
        // Mark question as answered correctly so it won’t be shown again.
        userProgress[category].answered.push(currentQuestion);
        // If the question exists in mistakes, remove it.
        userProgress[category].mistakes = userProgress[category].mistakes.filter(q => q.question !== currentQuestion.question);
        content.innerHTML = `<p>Correct! ${currentQuestion.explanation}</p>`;
    } else {
        userProgress[category].incorrect++;
        // Add to mistakes array (duplicates will be handled in weighting).
        userProgress[category].mistakes.push(currentQuestion);
        content.innerHTML = `<p>Incorrect! ${currentQuestion.explanation}</p>`;
    }
    updateLevel(category);
    setTimeout(() => showPerformanceSummary(category), 2000);
}

function updateLevel(category) {
    const xp = userProgress[category].xp;
    userProgress[category].level = Math.floor(xp / 50) + 1;
}

function showPerformanceSummary(category) {
    const progress = userProgress[category];
    const content = document.getElementById('content');
    content.innerHTML = `
        <div>
            <h2>${category} Performance Summary</h2>
            <p>Correct Answers: ${progress.correct}</p>
            <p>Incorrect Answers: ${progress.incorrect}</p>
            <p>XP: ${progress.xp}</p>
            <p>Level: ${progress.level} (${getDesiredDifficulty(category)})</p>
            <h3>Mistakes to Review</h3>
            ${progress.mistakes.map(mistake => `<p>${mistake.question} - ${mistake.explanation}</p>`).join('')}
        </div>
    `;
}

function showScroll() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div>
            <h2>Scroll Section</h2>
            <p>Educational content goes here...</p>
            <p>More educational content...</p>
            <p>Even more educational content...</p>
        </div>
    `;
}

function showLoginForm() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div id="login-form">
            <h2 class="text-center text-2xl mb-4">Login</h2>
            <input type="text" id="username" placeholder="Username" class="w-full p-2 mb-4 border rounded">
            <input type="password" id="password" placeholder="Password" class="w-full p-2 mb-4 border rounded">
            <button onclick="login()" class="w-full p-2 bg-blue-500 text-white rounded">Login</button>
            <p class="text-center mt-4">Don't have an account? <a href="#" onclick="showCreateAccountForm()">Create Account</a></p>
        </div>
    `;
}

function showCreateAccountForm() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div id="create-account-form">
            <h2 class="text-center text-2xl mb-4">Create Account</h2>
            <input type="text" id="new-username" placeholder="Username" class="w-full p-2 mb-4 border rounded">
            <input type="password" id="new-password" placeholder="Password" class="w-full p-2 mb-4 border rounded">
            <button onclick="createAccount()" class="w-full p-2 bg-blue-500 text-white rounded">Create Account</button>
            <p class="text-center mt-4">Already have an account? <a href="#" onclick="showLoginForm()">Login</a></p>
        </div>
    `;
}

function createAccount() {
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    if (username && password) {
        alert('Account created successfully!');
        showLoginForm();
    } else {
        alert('Please enter a username and password');
    }
}

function logout() {
    currentUser = null;
    showLoginForm();
    hideButtons();
}

function hideButtons() {
    const buttons = document.getElementById('buttons');
    buttons.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
    showLoginForm();
    hideButtons();
});