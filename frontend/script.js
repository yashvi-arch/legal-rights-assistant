// Backend URL — switches automatically between local dev and deployed site.
// When you deploy, replace 'https://your-backend.onrender.com' with your real backend URL.
const API_BASE = (location.hostname === '127.0.0.1' || location.hostname === 'localhost')
  ? 'http://127.0.0.1:8000'
  : 'https://legal-rights-assistant.onrender.com';

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chips = document.querySelectorAll('.chip');

// Turns basic markdown from Gemini (**bold**, numbered lists, line breaks)
// into safe HTML. User input is never passed through this — only bot text.
function renderMarkdown(text) {
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/(?:^|\n)(\d+)\.\s+/g, '<br><strong>$1.</strong> ');
  safe = safe.replace(/(?:^|\n)\*\s+/g, '<br>&nbsp;&nbsp;• ');
  safe = safe.replace(/\n/g, '<br>');
  safe = safe.replace(/^(<br>)+/, ''); // trim leading breaks

  return safe;
}

function addMessage(text, sender) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  if (sender === 'bot') {
    msg.innerHTML = renderMarkdown(text);
  } else {
    msg.textContent = text;
  }
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
  const typing = document.createElement('div');
  typing.classList.add('typing');
  typing.id = 'typingIndicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

sendBtn.addEventListener('click', () => sendMessage());
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    sendMessage(chip.dataset.question);
  });
});
// Show a welcome message from the bot when the page first loads,
// with a short typing delay so it feels alive rather than instant.
function showWelcomeMessage() {
  showTyping();
  setTimeout(() => {
    hideTyping();
    addMessage(
      "Hi! I'm your Legal Rights Assistant. I can help you understand your rights around:\n\n" +
      "1. **RTI** — how to file a Right to Information request\n" +
      "2. **Consumer Rights** — defective products, refunds, complaints\n" +
      "3. **Tenant Rights** — security deposits, eviction, rent agreements\n" +
      "4. **Cyber & Women's Safety** — reporting cybercrime and harassment\n\n" +
      "Tap a topic above or type your own question to get started.",
      'bot'
    );
  }, 900);
}

showWelcomeMessage();


function sendMessage(presetText) {
  const text = presetText || userInput.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  userInput.value = '';
  sendBtn.disabled = true;
  userInput.disabled = true;
  showTyping();

  fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: text })
  })
    .then(res => {
      if (!res.ok) throw new Error('Server error');
      return res.json();
    })
    .then(data => {
      hideTyping();
      addMessage(data.answer, 'bot');
    })
    .catch(err => {
      hideTyping();
      addMessage("Couldn't reach the backend. Make sure the server is running.", 'bot');
    })
    .finally(() => {
      sendBtn.disabled = false;
      userInput.disabled = false;
      userInput.focus();
    });
}