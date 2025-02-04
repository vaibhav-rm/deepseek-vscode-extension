import * as vscode from "vscode"
import ollama from "ollama"

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView
  _doc?: vscode.TextDocument

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    }

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

    this._setWebviewMessageListener(webviewView.webview)
  }

  private async _setWebviewMessageListener(webview: vscode.Webview) {
    const chatThreads: { [key: string]: { role: string; content: string }[] } = {}
    let activeThread = "Thread 1"
    chatThreads[activeThread] = []

    webview.onDidReceiveMessage(async (message: any) => {
      switch (message.command) {
        case "chat":
          const { text, model, thread } = message
          let responseText = ""

          chatThreads[thread] = chatThreads[thread] || []
          chatThreads[thread].push({ role: "user", content: text })

          try {
            const streamResponse = await ollama.chat({
              model: model,
              messages: chatThreads[thread],
              stream: true,
            })

            for await (const part of streamResponse) {
              responseText += part.message.content
              webview.postMessage({
                command: "chatResponse",
                text: responseText,
                thread: thread,
              })
            }

            chatThreads[thread].push({ role: "assistant", content: responseText })
          } catch (error) {
            webview.postMessage({
              command: "chatResponse",
              text: `Error: ${String(error)}`,
              thread: thread,
            })
          }
          break
        case "newThread":
          const newThreadName = `Thread ${Object.keys(chatThreads).length + 1}`
          chatThreads[newThreadName] = []
          webview.postMessage({ command: "updateThreads", threads: Object.keys(chatThreads) })
          break
        case "switchThread":
          activeThread = message.thread
          webview.postMessage({
            command: "loadMessages",
            messages: chatThreads[activeThread] || [],
          })
          break
        case "getModels":
          try {
            const response = await ollama.list()
            const models = response.models.map((m: any) => m.name)
            webview.postMessage({ command: "updateModels", models })
          } catch (error) {
            console.error("Error fetching models:", error)
            webview.postMessage({ command: "updateModels", models: [] })
          }
          break
      }
    })
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"))
    const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "styles.css"))

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${stylesUri}" rel="stylesheet">
                <title>Ollama Chat</title>
            </head>
            <body>
                <div id="app">
                    <h2>Ollama Chat</h2>
                    <select id="modelSelect">
                        <option value="">Select a model</option>
                    </select>
                    <div id="threads">
                        <button id="newThreadBtn">+ New Thread</button>
                    </div>
                    <div id="chatContainer"></div>
                    <div id="inputArea">
                        <textarea id="userInput" placeholder="Type your message..."></textarea>
                        <button id="sendBtn">Send</button>
                    </div>
                </div>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `
  }
}

