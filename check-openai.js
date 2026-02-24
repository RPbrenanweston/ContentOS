const OpenAI = require('openai');
console.log('typeof OpenAI:', typeof OpenAI);
console.log('typeof OpenAI.default:', typeof OpenAI.default);
console.log('OpenAI === OpenAI.default:', OpenAI === OpenAI.default);
console.log('OpenAI is constructor:', typeof OpenAI === 'function');
console.log('OpenAI.default is constructor:', typeof OpenAI.default === 'function');
