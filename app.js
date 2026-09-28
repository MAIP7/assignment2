// Submit handler
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const userText = userInput.value.trim();
  const apiKey = apiKeyInput.value.trim() || localStorage.getItem('gemini_user_api_key');

  if (!apiKey) {
    alert('Please enter your Gemini API key!');
    apiKeyInput.focus();
    return;
  }

  if (!userText) return;

  appendMessage('user', userText);
  userInput.value = '';

  conversationHistory.push({
    role: 'user',
    parts: [{ text: userText }]
  });

  const loadingDiv = appendMessage('ai', '*Thinking...*');
  const textElement = loadingDiv.querySelector('.bg-slate-800');
  sendBtn.disabled = true;

  // Active Gemini Model
  const targetModel = 'gemini-3.8-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

  // Automatic retry logic for "High demand" / 503 / 429 errors
  const maxRetries = 3;
  let attempt = 0;
  let success = false;

  while (attempt < maxRetries && !success) {
    try {
      attempt++;
      if (attempt > 1) {
        textElement.innerHTML = `*High demand detected. Retrying attempt ${attempt}/${maxRetries}...*`;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // wait 2s, 4s
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: conversationHistory })
      });

      const data = await res.json();

      if (!res.ok) {
        // If high demand or rate limit, throw error to trigger retry loop
        const errMsg = data.error?.message || 'API request failed';
        if (res.status === 503 || res.status === 429 || errMsg.includes('high demand')) {
          throw new Error(errMsg);
        } else {
          // Normal error (invalid key, bad request, etc.) - do not retry
          textElement.innerHTML = `<span class="text-rose-400">Error: ${errMsg}</span>`;
          success = true;
          return;
        }
      }

      const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiReply) throw new Error('No content returned from AI.');

      conversationHistory.push({
        role: 'model',
        parts: [{ text: aiReply }]
      });

      textElement.innerHTML = marked.parse(aiReply);
      success = true;

    } catch (err) {
      if (attempt >= maxRetries) {
        textElement.innerHTML = `<span class="text-rose-400 font-semibold">Error: The model is currently experiencing peak traffic. Please wait 10 seconds and send your message again.</span>`;
      }
    }
  }

  sendBtn.disabled = false;
  chatContainer.scrollTop = chatContainer.scrollHeight;
});