const categories = {
    Science: [],
    History: [],
    Technology: []
};

let userProgress = {
    Science: { correct: 0, incorrect: 0, mistakes: [] },
    History: { correct: 0, incorrect: 0, mistakes: [] },
    Technology: { correct: 0, incorrect: 0, mistakes: [] }
};

async function fetchQuestions(category) {
    const response = await fetch(`https://opentdb.com/api.php?amount=10&category=${category}&type=multiple`);
    const data = await response.json();
    return data.results.map(question => ({
        question: question.question,
        options: [...question.incorrect_answers, question.correct_answer].sort(() => Math.random() - 0.5),
        answer: question.correct_answer,
        explanation: "" // OpenTDB does not provide explanations
    }));
}

async function loadCategories() {
    const scienceQuestions = await fetchQuestions(17); // Science: Computers category ID
    const historyQuestions = await fetchQuestions(23); // History category ID
    const technologyQuestions = await fetchQuestions(18); // Science: Gadgets category ID

    categories.Science = scienceQuestions;
    categories.History = historyQuestions;
    categories.Technology = technologyQuestions;
}

function showCategories() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div>
            <h2>Select a Quiz Category</h2>
            <button onclick="startQuiz('Science')">Science</button>
            <button onclick="startQuiz('History')">History</button>
            <button onclick="startQuiz('Technology')">Technology</button>
        </div>
    `;
}

function startQuiz(category) {
    const questions = categories[category];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    const content = document.getElementById('content');
    content.innerHTML = `
        <div>
            <h2>${category} Quiz</h2>
            <p>${randomQuestion.question}</p>
            ${randomQuestion.options.map(option => `<button onclick="checkAnswer('${category}', '${randomQuestion.question}', '${option}')">${option}</button>`).join('')}
        </div>
    `;
}

function checkAnswer(category, question, selectedOption) {
    const questionData = categories[category].find(q => q.question === question);
    const content = document.getElementById('content');
    if (selectedOption === questionData.answer) {
        userProgress[category].correct++;
        content.innerHTML = `<p>Correct! ${questionData.explanation}</p>`;
    } else {
        userProgress[category].incorrect++;
        userProgress[category].mistakes.push(questionData);
        content.innerHTML = `<p>Incorrect! ${questionData.explanation}</p>`;
    }
    setTimeout(() => showCategories(), 2000);
}

function showPerformanceSummary(category) {
    const progress = userProgress[category];
    const content = document.getElementById('content');
    content.innerHTML = `
        <div>
            <h2>${category} Performance Summary</h2>
            <p>Correct Answers: ${progress.correct}</p>
            <p>Incorrect Answers: ${progress.incorrect}</p>
            <h3>Mistakes to Review</h3>
            ${progress.mistakes.map(mistake => `<p>${mistake.question} - ${mistake.explanation}</p>`).join('')}
        </div>
    `;
}

function showTrivia() {
    showCategories();
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

// Load categories and show categories on page load
loadCategories().then(showCategories);