/* ===== message.js =====
   Powers the Messages page: a sign-in gate for logged-out visitors,
   and a functional two-pane inbox for logged-in ones.

   Data honesty / architecture note: the backend (server/routes/
   messages.js) only has two routes:
     GET  /api/messages/thread?userA=...&userB=...  (one specific thread)
     POST /api/messages                              (send a message)
   There is NO "list all my conversations" endpoint. That means a real
   synced inbox isn't possible yet — so the conversation list here is
   built from threads opened *on this device* (stored in localStorage),
   not fetched from the server. This is disclosed in the UI itself
   ("Conversations" list empty-state) rather than presented as if it
   were a real synced inbox. The moment a real GET /api/messages/mine
   (or similar) route exists, this can be swapped for that.

   A conversation can be opened two ways:
   1. Arriving with ?to=<producerId>&name=<displayName> in the URL
      (this is how creators.js's "Message" button links here).
   2. Clicking a previously-opened thread in the sidebar.

   Depends on auth.js (window.LytuneAuth) having loaded first.
*/
(function () {
  const RECENT_THREADS_KEY = 'lytune-recent-threads';

  const gate = document.getElementById('messagesGate');
  const shell = document.getElementById('messagesShell');
  const threadListEl = document.getElementById('threadList');
  const offlineNote = document.getElementById('offlineNote');
  const chatHeader = document.getElementById('chatHeader');
  const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
  const chatHeaderName = document.getElementById('chatHeaderName');
  const chatMessages = document.getElementById('chatMessages');
  const chatCompose = document.getElementById('chatCompose');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageBtn');

  let currentUser = null;
  let activeThread = null; // { id, name }
  let recentThreads = [];  // [{ id, name, preview }]

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  /* ---------- local "recent threads" storage (device-only, disclosed) ---------- */

  function loadRecentThreads() {
    try {
      const raw = localStorage.getItem(RECENT_THREADS_KEY);
      recentThreads = raw ? JSON.parse(raw) : [];
    } catch (err) {
      recentThreads = [];
    }
  }

  function saveRecentThreads() {
    try {
      localStorage.setItem(RECENT_THREADS_KEY, JSON.stringify(recentThreads));
    } catch (err) { /* ignore */ }
  }

  function upsertRecentThread(id, name, preview) {
    const existing = recentThreads.find((t) => t.id === id);
    if (existing) {
      existing.name = name || existing.name;
      if (preview) existing.preview = preview;
    } else {
      recentThreads.unshift({ id, name: name || 'Producer', preview: preview || '' });
    }
    saveRecentThreads();
  }

  /* ---------- rendering ---------- */

  function renderThreadList() {
    if (!threadListEl) return;
    threadListEl.querySelectorAll('.thread-item').forEach((el) => el.remove());
    const empty = threadListEl.querySelector('.thread-list-empty');
    if (empty) empty.remove();

    if (recentThreads.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'thread-list-empty';
      emptyEl.innerHTML = 'No conversations on this device yet. Visit <a href="creators.html">Creators</a> and message someone to start one.';
      threadListEl.appendChild(emptyEl);
      return;
    }

    recentThreads.forEach((t) => {
      const item = document.createElement('div');
      item.className = 'thread-item' + (activeThread && activeThread.id === t.id ? ' active' : '');
      item.innerHTML =
        '<div class="thread-item-avatar" style="background:var(--brand-gradient-diag);">' + (t.name || '?').charAt(0).toUpperCase() + '</div>' +
        '<div class="thread-item-info">' +
          '<div class="thread-item-name">' + escapeHtml(t.name) + '</div>' +
          '<div class="thread-item-preview">' + escapeHtml(t.preview || 'No messages yet') + '</div>' +
        '</div>';
      item.addEventListener('click', () => openThread(t.id, t.name));
      threadListEl.appendChild(item);
    });
  }

  function renderBubble(msg) {
    const bubble = document.createElement('div');
    const sent = msg.fromId === (currentUser && currentUser.id);
    bubble.className = 'chat-bubble ' + (sent ? 'sent' : 'received');
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    bubble.innerHTML = escapeHtml(msg.text) + (time ? '<span class="chat-bubble-time">' + escapeHtml(time) + '</span>' : '');
    return bubble;
  }

  function showChatEmpty(message) {
    chatMessages.innerHTML =
      '<div class="chat-empty"><div class="founder-icon">💬</div><p>' + message + '</p></div>';
  }

  /* ---------- thread loading / sending ---------- */

  function openThread(producerId, producerName) {
    if (!currentUser) return;
    activeThread = { id: producerId, name: producerName || 'Producer' };
    upsertRecentThread(producerId, producerName);
    renderThreadList();

    chatHeader.classList.remove('is-hidden');
    chatHeaderAvatar.textContent = (activeThread.name || '?').charAt(0).toUpperCase();
    chatHeaderName.textContent = activeThread.name;

    const online = window.LytuneAuth && window.LytuneAuth.isOnline();
    if (offlineNote) offlineNote.classList.toggle('is-hidden', !!online);
    if (chatCompose) chatCompose.classList.toggle('is-hidden', !online);

    if (!online) {
      showChatEmpty('Messages will load here once the LyTune server is reachable.');
      return;
    }

    chatMessages.innerHTML = '<div class="chat-empty"><p>Loading messages…</p></div>';

    const url = window.LytuneAuth.apiBase + '/messages/thread?userA=' +
      encodeURIComponent(currentUser.id) + '&userB=' + encodeURIComponent(producerId);

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const msgs = data && Array.isArray(data.messages) ? data.messages : [];
        chatMessages.innerHTML = '';
        if (msgs.length === 0) {
          showChatEmpty('No messages yet — say hello!');
          return;
        }
        msgs.forEach((m) => chatMessages.appendChild(renderBubble(m)));
        chatMessages.scrollTop = chatMessages.scrollHeight;
        const last = msgs[msgs.length - 1];
        upsertRecentThread(producerId, producerName, last.text);
        renderThreadList();
      })
      .catch(() => {
        showChatEmpty('Could not load this conversation right now.');
      });
  }

  function sendMessage() {
    if (!currentUser || !activeThread || !messageInput.value.trim()) return;
    const text = messageInput.value.trim();
    const online = window.LytuneAuth && window.LytuneAuth.isOnline();
    if (!online) return;

    sendBtn.disabled = true;
    fetch(window.LytuneAuth.apiBase + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId: currentUser.id, toId: activeThread.id, text: text }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const emptyPlaceholder = chatMessages.querySelector('.chat-empty');
        if (emptyPlaceholder) chatMessages.innerHTML = '';
        chatMessages.appendChild(renderBubble(data.message || { fromId: currentUser.id, text: text, timestamp: new Date().toISOString() }));
        chatMessages.scrollTop = chatMessages.scrollHeight;
        upsertRecentThread(activeThread.id, activeThread.name, text);
        renderThreadList();
        messageInput.value = '';
      })
      .catch(() => {
        // Leave the typed text in place so nothing the person wrote is lost.
      })
      .finally(() => {
        sendBtn.disabled = false;
      });
  }

  /* ---------- init ---------- */

  function initShell() {
    loadRecentThreads();
    renderThreadList();

    const params = new URLSearchParams(window.location.search);
    const to = params.get('to');
    const name = params.get('name');

    if (to) {
      openThread(to, name);
    } else if (recentThreads.length > 0) {
      openThread(recentThreads[0].id, recentThreads[0].name);
    } else {
      showChatEmpty('Pick a conversation, or visit <a href="creators.html">Creators</a> to message someone new.');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    function render() {
      currentUser = window.LytuneAuth ? window.LytuneAuth.getUser() : null;
      if (currentUser) {
        gate.classList.add('is-hidden');
        shell.classList.remove('is-hidden');
        initShell();
      } else {
        gate.classList.remove('is-hidden');
        shell.classList.add('is-hidden');
      }
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (messageInput) {
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
    }

    if (window.LytuneAuth) {
      window.LytuneAuth.whenReady().then(render);
    } else {
      render();
    }
  });
})();
