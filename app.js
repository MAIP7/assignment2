const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const chatForm = document.getElementById('chatForm');
const sendBtn = document.getElementById('sendBtn');

// কনভারসেশন হিস্ট্রি মনে রাখার জন্য অ্যারে
let conversationHistory = [];

// পেজ লোড হলে সংরক্ষিত Key সেট করা
window.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('gemini_user_api_key');
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }
});

// API Key সেভ করা
saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    alert('Please enter a valid Gemini API key!');
    return;
  }
  localStorage.setItem('gemini_user_api_key', key);
  alert('API Key saved successfully in your local browser!');
});

// মেসেজ চ্যাটে ডিসপ্লে করা
function appendMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `flex items-start gap-3 ${sender === 'user' ? 'justify-end' : ''}`;

  if (sender === 'user') {
    msgDiv.innerHTML = `
      <div class="bg-cyan-600 text-white rounded-2xl rounded-tr-none p-4 max-w-[85%] text-sm leading-relaxed shadow">
        ${escapeHtml(text)}
      </div>
      <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
        You
      </div>
    `;
  } else {
    msgDiv.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
        AI
      </div>
      <div class="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none p-4 max-w-[85%] text-slate-200 text-sm leading-relaxed prose prose-invert shadow">
        ${marked.parse(text)}
      </div>
    `;
  }

  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return msgDiv;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// মেসেজ সাবমিট হ্যান্ডলার
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const userText = userInput.value.trim();
  const apiKey = apiKeyInput.value.trim() || localStorage.getItem('gemini_user_api_key');

  if (!apiKey) {
    alert('Please paste and save your Gemini API key first!');
    apiKeyInput.focus();
    return;
  }

  if (!userText) return;

  // স্ক্রিনে ইউজার মেসেজ দেখানো
  appendMessage('user', userText);
  userInput.value = '';

  // হিস্ট্রিতে যোগ করা
  conversationHistory.push({
    role: 'user',
    parts: [{ text: userText }]
  });

  // লোডিং মেসেজ তৈরি
  const loadingDiv = appendMessage('ai', '*Thinking...*');
  const textElement = loadingDiv.querySelector('.bg-slate-800');
  sendBtn.disabled = true;

  try {
    // ফ্রি টিয়ারের জন্য কার্যকর মডেল gemini-2.5-flash
   const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: conversationHistory
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'API request failed.');
    }

    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiReply) {
      throw new Error('No content returned from AI.');
    }

    // AI উত্তরটি হিস্ট্রিতে রাখা
    conversationHistory.push({
      role: 'model',
      parts: [{ text: aiReply }]
    });

    textElement.innerHTML = marked.parse(aiReply);

  } catch (err) {
    textElement.innerHTML = `<span class="text-rose-400 font-semibold">Error: ${err.message}</span>`;
  } finally {
    sendBtn.disabled = false;
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
});