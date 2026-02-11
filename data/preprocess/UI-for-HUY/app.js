const thread = document.getElementById("thread");
const composer = document.getElementById("composer");
const promptInput = document.getElementById("prompt");
const mockStatus = document.getElementById("status");
const regenerateBtn = document.getElementById("regenerateBtn");
const stopBtn = document.getElementById("stopBtn");
const newChatBtn = document.getElementById("newChat");
const uploadBtn = document.getElementById("uploadBtn");
const voiceBtn = document.getElementById("voiceBtn");
const fileInput = document.getElementById("fileInput");
const attachments = document.getElementById("attachments");
const suggestions = document.querySelectorAll(".suggestion");
const historyList = document.getElementById("historyList");
const pinnedList = document.getElementById("pinnedList");
const searchHistory = document.getElementById("searchHistory");

const pinnedChats = [
  "Tư vấn đau đầu mãn tính",
  "Chế độ ăn cho tiểu đường",
  "Phân tích xét nghiệm máu",
];

const historyChats = [
  "Đau họng + sốt nhẹ",
  "Phát ban da",
  "Đau dạ dày",
  "Viêm mũi dị ứng",
  "Tư vấn tiêm chủng",
];

let typingTimer = null;
let lastUserMessage = "";

const renderChatList = (list, items) => {
  list.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "chat-item";
    li.textContent = item;
    list.appendChild(li);
  });
};

renderChatList(pinnedList, pinnedChats);
renderChatList(historyList, historyChats);

const addMessage = (content, role = "bot") => {
  const msg = document.createElement("article");
  msg.className = `msg ${role}`;
  msg.innerHTML =
    role === "bot"
      ? `
        <div class="avatar">🩺</div>
        <div class="bubble">${content}</div>
      `
      : `
        <div class="bubble">${content}</div>
      `;
  thread.appendChild(msg);
  thread.scrollTop = thread.scrollHeight;
};

// Expose function for Python to call back
window.receive_ai_response = (content) => {
    const formattedResponse = content 
        ? content.replace(/\n/g, "<br>") 
        : "No response received.";
    addMessage(formattedResponse, "bot");
    mockStatus.textContent = "Ready";
    stopBtn.disabled = true;
};
// Register with Eel (if Eel is loaded)
if (window.eel) {
    window.eel.expose(receive_ai_response, 'receive_ai_response');
}

const mockReply = async () => {
  stopTyping();
  mockStatus.textContent = "Thinking...";
  stopBtn.disabled = false;

  try {
      // Call Python backend via Eel - NOW NON-BLOCKING
      // We don't await the answer content here anymore.
      await eel.ask_ai(lastUserMessage)();
      
      // The answer will come via receive_ai_response() later.
  } catch (error) {
      console.error(error);
      addMessage("Sorry, connection to AI failed.", "bot");
      mockStatus.textContent = "Error";
      stopBtn.disabled = true;
  }
};

const stopTyping = () => {
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
    mockStatus.textContent = "Stopped";
  }
};

const resetComposer = () => {
  promptInput.value = "";
  promptInput.style.height = "auto";
};

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = promptInput.value.trim();
  if (!value) return;
  lastUserMessage = value;
  addMessage(`<p>${value}</p>`, "user");
  resetComposer();
  mockReply();
});

regenerateBtn.addEventListener("click", () => {
  if (!lastUserMessage) return;
  mockReply();
});

stopBtn.addEventListener("click", () => {
  stopTyping();
  stopBtn.disabled = true;
});

newChatBtn.addEventListener("click", () => {
  thread.innerHTML = "";
  addMessage(
    "<p>Xin chào! Hãy chia sẻ triệu chứng hoặc câu hỏi y tế.</p>",
    "bot"
  );
  lastUserMessage = "";
  attachments.innerHTML = "";
  mockStatus.textContent = "Ready";
});

uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  attachments.innerHTML = "";
  [...fileInput.files].forEach((file) => {
    const chip = document.createElement("span");
    chip.className = "attachment";
    chip.textContent = file.name;
    attachments.appendChild(chip);
  });
});

voiceBtn.addEventListener("click", () => {
  mockStatus.textContent = "Voice input is mocked";
  setTimeout(() => {
    mockStatus.textContent = "Ready";
  }, 1200);
});

promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";
  promptInput.style.height = `${promptInput.scrollHeight}px`;
});

suggestions.forEach((btn) => {
  btn.addEventListener("click", () => {
    promptInput.value = btn.textContent;
    promptInput.focus();
    promptInput.dispatchEvent(new Event("input"));
  });
});

searchHistory.addEventListener("input", () => {
  const query = searchHistory.value.toLowerCase();
  const filtered = historyChats.filter((item) =>
    item.toLowerCase().includes(query)
  );
  renderChatList(historyList, filtered);
});
