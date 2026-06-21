// Backend URL — switches automatically between local dev and deployed site.
const API_BASE = (location.hostname === '127.0.0.1' || location.hostname === 'localhost')
  ? 'http://127.0.0.1:8000'
  : 'https://legal-rights-assistant.onrender.com';

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chips = document.querySelectorAll('.chip');

function renderMarkdown(text) {
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/(?:^|\n)(\d+)\.\s+/g, '<br><strong>$1.</strong> ');
  safe = safe.replace(/(?:^|\n)\*\s+/g, '<br>&nbsp;&nbsp;• ');
  safe = safe.replace(/\n/g, '<br>');
  safe = safe.replace(/^(<br>)+/, '');

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

// ----- Dark mode toggle -----
const themeToggleBtn = document.getElementById('themeToggle');
const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
const moonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = isDark ? sunIcon : moonIcon;
  }
}

if (themeToggleBtn) {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  let isDark = prefersDark;
  applyTheme(isDark);

  themeToggleBtn.addEventListener('click', () => {
    isDark = !isDark;
    applyTheme(isDark);
  });
}

// ----- Button click ripple effect -----
sendBtn.addEventListener('click', function (e) {
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  const rect = sendBtn.getBoundingClientRect();
  ripple.style.left = `${e.clientX - rect.left}px`;
  ripple.style.top = `${e.clientY - rect.top}px`;
  ripple.style.width = ripple.style.height = `${Math.max(rect.width, rect.height)}px`;
  ripple.style.marginLeft = ripple.style.marginTop = `-${Math.max(rect.width, rect.height) / 2}px`;
  sendBtn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
});