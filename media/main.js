// Import the VS Code API
const vscode = acquireVsCodeApi()
let activeThread = "Thread 1"

// Initialize
vscode.postMessage({ command: "getModels" })

document.getElementById("newThreadBtn").addEventListener("click", () => {
  vscode.postMessage({ command: "newThread" })
})

document.getElementById("sendBtn").addEventListener("click", () => {
  const text = document.getElementById("userInput").value.trim()
  const model = document.getElementById("modelSelect").value
  if (text && model) {
    vscode.postMessage({ command: "chat", text, model, thread: activeThread })
    addMessageToChat(text, "user")
    document.getElementById("userInput").value = ""
  }
})

window.addEventListener("message", (event) => {
  const message = event.data
  switch (message.command) {
    case "chatResponse":
      if (message.thread === activeThread) {
        addMessageToChat(message.text, "assistant")
      }
      break
    case "updateThreads":
      updateThreads(message.threads)
      break
    case "loadMessages":
      loadMessages(message.messages)
      break
    case "updateModels":
      updateModels(message.models)
      break
  }
})

function addMessageToChat(content, role) {
  const chatContainer = document.getElementById("chatContainer")
  const messageDiv = document.createElement("div")
  messageDiv.classList.add("message", role)
  messageDiv.textContent = content
  chatContainer.appendChild(messageDiv)
  chatContainer.scrollTop = chatContainer.scrollHeight
}

function updateThreads(threads) {
  const threadsContainer = document.getElementById("threads")
  threadsContainer.innerHTML = '<button id="newThreadBtn">+ New Thread</button>'
  threads.forEach((thread) => {
    const btn = document.createElement("button")
    btn.textContent = thread
    btn.classList.add("thread-btn")
    if (thread === activeThread) btn.classList.add("active")
    btn.addEventListener("click", () => switchThread(thread))
    threadsContainer.appendChild(btn)
  })

  document.getElementById("newThreadBtn").addEventListener("click", () => {
    vscode.postMessage({ command: "newThread" })
  })
}

function switchThread(thread) {
  activeThread = thread
  vscode.postMessage({ command: "switchThread", thread })
  updateThreadButtons()
}

function updateThreadButtons() {
  document.querySelectorAll(".thread-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.textContent === activeThread)
  })
}

function loadMessages(messages) {
  const chatContainer = document.getElementById("chatContainer")
  chatContainer.innerHTML = ""
  messages.forEach((msg) => addMessageToChat(msg.content, msg.role))
}

function updateModels(models) {
  const modelSelect = document.getElementById("modelSelect")
  modelSelect.innerHTML = '<option value="">Select a model</option>'
  models.forEach((model) => {
    const option = document.createElement("option")
    option.value = model
    option.textContent = model
    modelSelect.appendChild(option)
  })
}

