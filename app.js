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
        <div class="btn btn-blue mb-2" onclick="showTrivia()">Trivia Game</div>
        <div class="btn btn-blue" onclick="showScroll()">Scroll Section</div>
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

function updateTriviaNav() {
    const buttons = document.getElementById('buttons');
    buttons.innerHTML = `
        <div class="btn btn-red" onclick="showCategories()">Back to Trivia Menu</div>
        <div class="btn btn-blue" onclick="window.location.href='menu.html'">Main Menu</div>
    `;
}

function showCategories() {
    let globalXp = 0;
    Object.values(userProgress).forEach(data => {
        globalXp += data.xp;
    });

    const rankNames = [
        "Rookie", "Apprentice", "Prodigy", "Expert", "Master",
        "Grandmaster", "Legend", "Mythic", "Immortal", "Transcendent"
    ];

    let rankIndex = Math.floor(globalXp / 90);
    if (rankIndex >= rankNames.length) {
        rankIndex = rankNames.length - 1;
    }

    const content = document.getElementById('content');
    content.innerHTML = `
<div class="text-center">
    <h2 class="text-2xl font-bold mb-4">Choose a Topic</h2>

    <div class="grid grid-cols-2 gap-4">
        <button class="btn btn-blue" onclick="showTopicMenu('Science')">Science</button>
        <button class="btn btn-green" onclick="showTopicMenu('History')">History</button>
        <button class="btn btn-purple" onclick="showTopicMenu('Technology')">Technology</button>
        <button class="btn btn-yellow" onclick="showTopicMenu('Sports')">Sports</button>
    </div>

    <div class="fixed bottom-20 left-4 right-4 bg-gray-800 p-3 rounded-lg text-sm">
        <h3 class="font-bold mb-1">Global Stats</h3>
        <p class="mb-1">Total XP: ${globalXp}</p>
        <p class="mb-2">Rank: ${rankNames[rankIndex]}</p>

        <div class="grid grid-cols-2 gap-1 text-xs">
            ${Object.entries(userProgress).map(([category, data]) => `
                <div class="bg-gray-700 p-1 rounded">
                    ${category}: ${data.xp} XP (Lvl ${data.level})
                </div>
            `).join('')}
        </div>
    </div>
</div>
    `;
}

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
    const difficultyQuestions = ((questionsData[category] && questionsData[category][difficulty]) || [])
        .filter(q => !userProgress[category].completed.includes(q.question));

    const mistakeCount = {};
    userProgress[category].mistakes.forEach(m => {
        mistakeCount[m.question] = (mistakeCount[m.question] || 0) + 2;
    });

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
    window.currentQuiz = {
        questions: selectedQuestions,
        index: 0,
        category: category,
        currentMistakes: []
    };
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
                    <button class="btn btn-blue w-full" onclick="checkAnswer(window.currentQuiz.category, \`${option}\`)">${option}</button>
                 </div>`
    ).join('')}
        </div>
    `;
}

function checkAnswer(category, selectedOption) {
    const questionData = window.currentQuestion;
    if (!questionData) {
        console.error("Question not found in currentQuestion");
        alert("An error occurred. Please try again.");
        return;
    }

    const isCorrect = selectedOption === questionData.answer;
    const popup = document.createElement('div');
    popup.className = 'popup fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
    popup.innerHTML = `
        <div class="popup-content bg-gray-800 p-6 rounded-lg shadow-lg text-white w-3/4 max-w-lg">
            <p class="mb-4">${isCorrect ? 'Correct!' : 'Incorrect!'}</p>
            <p class="mb-4">${questionData.explanation}</p>
            <button class="btn btn-red mt-4" onclick="nextQuestion()">Next Question</button>
        </div>
    `;
    document.body.appendChild(popup);

    if (isCorrect) {
        userProgress[category].correct++;
        userProgress[category].xp += 10;
        if (!userProgress[category].completed.includes(questionData.question)) {
            userProgress[category].completed.push(questionData.question);
        }
    } else {
        userProgress[category].incorrect++;
        userProgress[category].mistakes.push({
            question: questionData.question,
            timestamp: new Date().getTime()
        });
        window.currentQuiz.currentMistakes.push(questionData);
    }
    updateLevel(category);
}

function nextQuestion() {
    const popup = document.querySelector('.popup');
    if (popup) {
        document.body.removeChild(popup);
    }
    window.currentQuiz.index++;
    if (window.currentQuiz.index < window.currentQuiz.questions.length) {
        window.currentQuestion = window.currentQuiz.questions[window.currentQuiz.index];
    }
    showCurrentQuizQuestion();
}

function updateLevel(category) {
    const xp = userProgress[category].xp;
    userProgress[category].level = Math.floor(xp / 100) + 1;
}

function showPerformanceSummary(category) {
    const progress = userProgress[category];
    const currentMistakes = window.currentQuiz.currentMistakes || [];
    const content = document.getElementById('content');

    let mistakesHTML = currentMistakes.length > 0
        ? `<ul class="list-disc ml-5 text-left">` +
        currentMistakes.map(mistake =>
            `<li class="mb-2">
                <span class="font-semibold text-red-500">Question:</span> ${mistake.question}<br/>
            </li>`
        ).join('') +
        `</ul>`
        : `<p class="text-green-600">No mistakes in this quiz, well done!</p>`;

    content.innerHTML = `
    <div class="text-center p-4">
        <h2 class="text-xl font-bold mb-4">${category} Performance Summary</h2>
        <p class="mb-1">Correct Answers: ${progress.correct}</p>
        <p class="mb-1">Incorrect Answers: ${progress.incorrect}</p>
        <p class="mb-1">XP: ${progress.xp}</p>
        <p class="mb-1">Level: ${progress.level}</p>
        <h3 class="text-lg font-semibold mb-2">Mistakes in This Quiz</h3>
        ${mistakesHTML}
        <div class="mt-4">
            <button class="btn btn-blue" onclick="showCategories()">Back to Topics</button>
            <button class="btn btn-green" onclick="startQuiz('${category}')">Retry Topic</button>
        </div>
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

function showTopicMenu(category) {
    const progress = userProgress[category];
    const mistakeCounts = {};
    progress.mistakes.forEach(mistake => {
        mistakeCounts[mistake.question] = (mistakeCounts[mistake.question] || 0) + 1;
    });

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="text-center p-4">
            <h2 class="text-2xl font-bold mb-4">${category}</h2>

            <div class="bg-gray-700 rounded-lg p-4 mb-6">
                <h3 class="text-lg font-semibold mb-2">Topic Statistics</h3>
                <p class="mb-1">Level: ${progress.level}</p>
                <p class="mb-1">XP: ${progress.xp}</p>
                <p class="mb-1">Total Correct: ${progress.correct}</p>
                <p class="mb-1">Total Incorrect: ${progress.incorrect}</p>
                <p class="mb-1">Questions Completed: ${progress.completed.length}</p>
            </div>

            <div class="flex flex-col gap-3">
                <button class="btn btn-green" onclick="startQuiz('${category}')">Start Quiz</button>
                <button class="btn btn-yellow" onclick="showMistakesPopup('${category}')">View Missed Questions</button>
                <button class="btn btn-red" onclick="showCategories()">Back to Topics</button>
            </div>
        </div>
    `;
}

function showMistakesPopup(category) {
    const progress = userProgress[category];
    const mistakeCounts = {};
    progress.mistakes.forEach(mistake => {
        mistakeCounts[mistake.question] = (mistakeCounts[mistake.question] || 0) + 1;
    });

    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    let mistakesHTML = Object.keys(mistakeCounts).length > 0
        ? `<ul class="list-disc ml-5 text-left max-h-60 overflow-y-auto">
            ${Object.entries(mistakeCounts).map(([question, count]) =>
            `<li class="mb-2">
                    <span class="font-semibold">Missed ${count} times:</span><br>
                    ${question}
                </li>`
        ).join('')}
           </ul>`
        : '<p class="text-green-500">No questions missed yet!</p>';

    popup.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-lg w-3/4 max-w-lg">
            <h3 class="text-xl font-bold mb-4">Missed Questions - ${category}</h3>
            ${mistakesHTML}
            <button class="btn btn-red mt-4" onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
    `;
    document.body.appendChild(popup);
}

document.addEventListener('DOMContentLoaded', () => {
    showTrivia();
});