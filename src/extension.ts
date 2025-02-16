import * as vscode from 'vscode';
import ollama from 'ollama';

export function activate(context: vscode.ExtensionContext) {
    console.log("Ollama VS Code extension is now active!");

    const disposable = vscode.commands.registerCommand('ollama-vscode-chat.start', async () => {
        const panel = vscode.window.createWebviewPanel(
            'ollamaChat',
            'VS Ollama',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        let models: string[] = [];
        try {
            const response = await ollama.list();
            models = response.models.map((m: any) => m.name);
        } catch (error) {
            console.error("Error fetching models:", error);
        }

        panel.webview.html = getWebViewContent(models);

        panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === "chat") {
                const { text, model } = message;
        
                // Append user's message
                // panel.webview.postMessage({ command: "chatResponse", text: "You: " + text, type: "user" });
        
                // Create a placeholder AI message (empty for now)
                const responseId = Date.now(); // Unique ID to track this message
                panel.webview.postMessage({ command: "startStream", id: responseId, text: model + " is thinking..." });
        
                try {
                    const streamResponse = await ollama.chat({
                        model: model,
                        messages: [{ role: "user", content: text }],
                        stream: true
                    });
        
                    let responseText = "";
        
                    for await (const part of streamResponse) {
                        if (part?.message?.content) {
                            responseText += part.message.content;
        
                            // Update the AI message dynamically
                            panel.webview.postMessage({ command: "updateStream", id: responseId, text: responseText });
                        }
                    }
        
                    if (!responseText.trim()) {
                        panel.webview.postMessage({ command: "updateStream", id: responseId, text: "No response received. Please try again." });
                    }
                } catch (error) {
                    console.error("Error in chat processing:", error);
                    panel.webview.postMessage({ command: "updateStream", id: responseId, text: `Error: ${String(error)}` });
                }
            }
        });
        

        context.subscriptions.push(panel);
    });

    context.subscriptions.push(disposable);
}

function getWebViewContent(models: string[]): string {
    const modelOptions = models.map(m => `<option value="${m}">${m}</option>`).join('');

    return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        background-color: #1e1e1e; 
        color: #fff; 
        margin: 0; 
        padding: 0; 
    }

    .container { 
        padding: 20px; 
        display: flex; 
        flex-direction: column; 
        gap: 10px; 
        max-width: 500px; /* Ensures all elements stay aligned */
        margin: 0 auto; /* Centers the card */
    }

    h2 { 
        text-align: center; 
        color: #61dafb; 
    }

    select, textarea, button, #response { 
        width: 100%; 
        padding: 10px; 
        border-radius: 5px; 
        border: none; 
        font-size: 14px; 
        background: #333; 
        color: #fff; 
        box-sizing: border-box; /* Ensures padding doesn’t affect width */
    }

    textarea { 
        resize: vertical; 
        min-height: 50px; 
        max-height: 200px; 
    }

    button { 
        background: #007acc; 
        cursor: pointer; 
    }

    button:hover { 
        background: #005f99; 
    }

    #response { 
        background: #333; 
        padding: 15px; 
        border-radius: 5px; 
        overflow-y: auto; 
        height: 250px; 
    }

    .message { 
        margin: 5px 0; 
        padding: 8px 12px; 
        border-radius: 6px; 
    }

    .user { 
        background: #007acc; 
        align-self: flex-end; 
    }

    .ai { 
        background: #444; 
        align-self: flex-start; 
    }
</style>

    </head>
    <body>
        <div class="container">
            <h2>Ollama VS Code Chat</h2>
            <label for="modelSelect">Select Model:</label>
            <select id="modelSelect">${modelOptions}</select>
            <textarea id="prompt" rows="3" placeholder="Ask something..."></textarea>
            <button id="askBtn">Send</button>
            <div id="response"></div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('askBtn').addEventListener('click', () => {
                const text = document.getElementById('prompt').value.trim();
                const model = document.getElementById('modelSelect').value;
                if (text && model) {
                    appendMessage("You: " + text, "user");
                    vscode.postMessage({ command: 'chat', text, model });
                    document.getElementById('prompt').value = "";
                }
            });

            function appendMessage(text, type) {
                const responseBox = document.getElementById('response');
                const messageElement = document.createElement('div');
                messageElement.classList.add('message', type);
                messageElement.textContent = text;
                responseBox.appendChild(messageElement);
                responseBox.scrollTop = responseBox.scrollHeight;
            }

            window.addEventListener("message", function(event) {
    const { command, text, id, type } = event.data;

    if (command === "chatResponse") {
        appendMessage(text, type);
    } else if (command === "startStream") {
        startStreamingMessage(id, text);
    } else if (command === "updateStream") {
        updateStreamingMessage(id, text);
    }
});

function appendMessage(text, type) {
    const responseBox = document.getElementById("response");
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", type);
    messageElement.textContent = text;
    responseBox.appendChild(messageElement);
    responseBox.scrollTop = responseBox.scrollHeight;
}

function startStreamingMessage(id, text) {
    const responseBox = document.getElementById("response");
    const newMessage = document.createElement("div");
    newMessage.id = "message-" + id;
    newMessage.classList.add("message", "ai");
    newMessage.textContent = text;
    responseBox.appendChild(newMessage);
    responseBox.scrollTop = responseBox.scrollHeight;
}

function updateStreamingMessage(id, text) {
            const messageElement = document.getElementById("message-" + id);
            if (!messageElement) return;

            const codeBlockRegex = /\\\`\\\`\\\`(\\w+)?\\n([\\s\\S]+?)\\\`\\\`\\\`/g;
            let formattedText = text.replace(codeBlockRegex, (match, lang = "plaintext", code) => {
                return \`<pre><code class="language-\${lang}">\${escapeHtml(code)}</code></pre>\`;
            });

            messageElement.innerHTML = formattedText;
            Prism.highlightAll();
        }

        function escapeHtml(unsafe) {
            return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }
        </script>
    </body>
    </html>
    `;
}

export function deactivate() {}
