let questionsData = {};

const categories = {
    Science: [],
    History: [],
    Technology: [],
    Sports: []
};

let userProgress = {
    Science: { correct: 0, incorrect: 0, mistakes: [], completed: [], xp: 0, level: 1 },
    History: { correct: 0, incorrect: 0, mistakes: [], completed: [], xp: 0, level: 1 },
    Technology: { correct: 0, incorrect: 0, mistakes: [], completed: [], xp: 0, level: 1 },
    Sports: { correct: 0, incorrect: 0, mistakes: [], completed: [], xp: 0, level: 1 }
};

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            console.error('Error fetching questions:', response.status);
            return;
        }
        questionsData = await response.json();
        console.log('Questions loaded from questions.json');
        // Build overall category list for later use if needed.
        for (const category in questionsData) {
            for (const difficulty in questionsData[category]) {
                categories[category].push(...questionsData[category][difficulty]);
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

function showButtons() {
    const buttons = document.getElementById('buttons');
    buttons.innerHTML = `
        <div class="text-center py-2 cursor-pointer text-white rounded-lg bg-blue-500 shadow-lg transform transition-transform duration-200 hover:scale-105 hover:shadow-xl mb-2" onclick="showTrivia()">Trivia Game</div>
        <div class="text-center py-2 cursor-pointer text-white rounded-lg bg-blue-500 shadow-lg transform transition-transform duration-200 hover:scale-105 hover:shadow-xl" onclick="showScroll()">Scroll Section</div>
    `;
}

async function showTrivia() {
    // Load questions if not already loaded
    if (Object.keys(categories).every(category => categories[category].length > 0)) {
        showCategories();
    } else {
        await loadQuestions();
        showCategories();
    }
    updateTriviaNav();
}

function updateTriviaNav() {
    const buttons = document.getElementById('buttons');
    buttons.innerHTML = `
        <div class="text-center py-2 cursor-pointer bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600" onclick="showCategories()">Back to Trivia Menu</div>
        <div class="text-center py-2 cursor-pointer bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600" onclick="window.location.href='index.html'">Main Menu</div>
    `;
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
        globalXp += xp;
        xpDetails += `<div>${category}: XP: ${xp} | Level: ${level}</div>`;
    });

    const rankNames = [
        "Rookie",
        "Apprentice",
        "Prodigy",
        "Expert",
        "Master",
        "Grandmaster",
        "Legend",
        "Mythic",
        "Immortal",
        "Transcendent"
    ];
    let rankIndex = Math.floor(globalXp / 90);
    if (rankIndex >= rankNames.length) {
        rankIndex = rankNames.length - 1;
    }

    xpLevel.innerHTML = `<div>Global XP: ${globalXp} \\(Rank: ${rankNames[rankIndex]}\\)</div>${xpDetails}`;
}

// Helper: weighted random selection without replacement.
function pickWeightedRandom(weightedQuestions, count) {
    let selected = [];
    let available = [...weightedQuestions];
    while (selected.length < count && available.length > 0) {
        const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        let cumulative = 0;
        for (let i = 0; i < available.length; i++) {
            cumulative += available[i].weight;
            if (random < cumulative) {
                selected.push(available[i].question);
                available.splice(i, 1);
                break;
            }
        }
    }
    return selected;
}

// Helper: build weighted question list.
function prioritizeQuestions(category) {
    const level = userProgress[category].level;
    let difficulty;
    if (level === 1) {
        difficulty = "easy";
    } else if (level === 2) {
        difficulty = "medium";
    } else {
        difficulty = "hard";
    }
    // Get unique questions for the difficulty that have not been completed.
    const difficultyQuestions = ((questionsData[category] && questionsData[category][difficulty]) || [])
        .filter(q => !userProgress[category].completed.includes(q.question));

    // Count mistakes for weighting.
    const mistakeCount = {};
    userProgress[category].mistakes.forEach(m => {
        mistakeCount[m.question] = (mistakeCount[m.question] || 0) + 2;
    });

    // Build weighted list.
    const weightedQuestions = difficultyQuestions.map(q => {
        return { question: q, weight: 1 + (mistakeCount[q.question] || 0) };
    });

    return weightedQuestions;
}

function startQuiz(category) {
    const weightedQuestions = prioritizeQuestions(category);
    if (weightedQuestions.length === 0) {
        alert("No questions available for this category.");
        return;
    }
    const questionCount = Math.min(3, weightedQuestions.length);
    const selectedQuestions = pickWeightedRandom(weightedQuestions, questionCount);
    window.currentQuiz = { questions: selectedQuestions, index: 0, category: category };
    showCurrentQuizQuestion();
}

function showCurrentQuizQuestion() {
    const quiz = window.currentQuiz;
    if (!quiz || quiz.index >= quiz.questions.length) {
        showPerformanceSummary(window.currentQuiz.category);
        return;
    }
    const currentQuestion = quiz.questions[quiz.index];
    window.currentQuestion = currentQuestion;
    const content = document.getElementById("content");
    content.innerHTML = `
        <div class="text-center">
            <h2 class="text-2xl font-bold mb-4">${window.currentQuiz.category} Quiz</h2>
            <p class="mb-4">Question ${quiz.index + 1} of ${quiz.questions.length}: ${currentQuestion.question}</p>
            ${currentQuestion.options.map(option =>
        `<div class="mb-2">
                    <button class="w-full py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600" onclick="checkAnswer(window.currentQuiz.category, \`${option}\`)">${option}</button>
                 </div>`
    ).join('')}
        </div>
    `;
    showXPLevel();
}

function checkAnswer(category, selectedOption) {
    const questionData = window.currentQuestion;
    const content = document.getElementById('content');
    if (!questionData) {
        console.error("Question not found in currentQuestion");
        alert("An error occurred. Please try again.");
        return;
    }
    if (selectedOption === questionData.answer) {
        userProgress[category].correct++;
        userProgress[category].xp += 10;
        // Remove any instance of this question from mistakes.
        userProgress[category].mistakes = userProgress[category].mistakes.filter(q => q.question !== questionData.question);
        if (!userProgress[category].completed.includes(questionData.question)) {
            userProgress[category].completed.push(questionData.question);
        }
        content.innerHTML = `<p>Correct! ${questionData.explanation}</p>`;
    } else {
        userProgress[category].incorrect++;
        // Add one instance to mistakes so the weight increases.
        if (!userProgress[category].mistakes.find(q => q.question === questionData.question)) {
            userProgress[category].mistakes.push(questionData);
        }
        content.innerHTML = `<p>Incorrect! ${questionData.explanation}</p>`;
    }
    updateLevel(category);
    setTimeout(() => {
        window.currentQuiz.index++;
        showCurrentQuizQuestion();
    }, 2000);
}

function updateLevel(category) {
    const xp = userProgress[category].xp;
    userProgress[category].level = Math.floor(xp / 100) + 1;
}

function showPerformanceSummary(category) {
    const progress = userProgress[category];
    const uniqueMistakes = Array.from(new Map(progress.mistakes.map(item => [item.question, item])).values());
    const content = document.getElementById('content');

    let mistakesHTML = uniqueMistakes.length > 0
        ? `<ul class="list-disc ml-5 text-left">` +
        uniqueMistakes.map(mistake =>
            `<li class="mb-2">
          <span class="font-semibold text-red-500">Question:</span> ${mistake.question}<br/>
        </li>`
        ).join('') +
        `</ul>`
        : `<p class="text-green-600">No mistakes, well done!</p>`;

    content.innerHTML = `
    <div class="text-center p-4">
      <h2 class="text-xl font-bold mb-4">${category} Performance Summary</h2>
      <p class="mb-1">Correct Answers: ${progress.correct}</p>
      <p class="mb-1">Incorrect Answers: ${progress.incorrect}</p>
      <p class="mb-1">XP: ${progress.xp}</p>
      <p class="mb-4">Level: ${progress.level}</p>
      <h3 class="text-lg font-semibold mb-2">Mistakes to Review</h3>
      ${mistakesHTML}
    </div>
  `;
}

function showScroll() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="text-center">
            <h2 class="text-2xl font-bold mb-4">Scroll Section</h2>
            <p>This section can be filled with scrolling content.</p>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    showTrivia();
});