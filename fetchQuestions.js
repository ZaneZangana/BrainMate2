const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const categories = {
    Science: 'https://opentdb.com/api.php?amount=10&category=17&difficulty=',
    History: 'https://opentdb.com/api.php?amount=10&category=23&difficulty=',
    Technology: 'https://opentdb.com/api.php?amount=10&category=18&difficulty=',
    Sports: 'https://opentdb.com/api.php?amount=10&category=21&difficulty='
};

const difficulties = ['easy', 'medium', 'hard'];

async function fetchQuestions(url, retries = 3, backoff = 3000) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 429 && retries > 0) {
                console.warn(`Rate limit exceeded. Retrying in ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return fetchQuestions(url, retries - 1, backoff * 2);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data.results) {
            throw new Error('No results found');
        }
        return data.results.map(question => ({
            question: question.question,
            options: [...question.incorrect_answers, question.correct_answer].sort(() => Math.random() - 0.5),
            answer: question.correct_answer,
            explanation: "" // OpenTDB does not provide explanations
        }));
    } catch (error) {
        console.error('Error fetching questions:', error);
        return [];
    }
}

async function loadAllQuestions() {
    const allQuestions = {};

    for (const [category, baseUrl] of Object.entries(categories)) {
        allQuestions[category] = { easy: [], medium: [], hard: [] };
        for (const difficulty of difficulties) {
            const questions = await fetchQuestions(`${baseUrl}${difficulty}`);
            allQuestions[category][difficulty].push(...questions);
        }
    }

    fs.writeFileSync('questions.json', JSON.stringify(allQuestions, null, 2));
    console.log('Questions saved to questions.json');
}

loadAllQuestions();