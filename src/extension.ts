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

		// Fetch available models and send them to the webview
		let models: string[] = [];
		try {
			const response = await ollama.list();
			models = response.models.map((m: any) => m.name);
		} catch (error) {
			console.error("Error fetching models:", error);
		}

		panel.webview.html = getWebViewContent(models);

        panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === 'chat') {
                const { text, model } = message;
        
                // Append user input to response box
               // panel.webview.postMessage({ command: 'chatResponse', text: `You: ${text}\n`, append: true });
        
                // Append thinking message
                panel.webview.postMessage({ command: 'chatResponse', text: `${model} is thinking...`, append: true });
        
                try {
                    const streamResponse = await ollama.chat({
                        model: model,
                        messages: [{ role: 'user', content: text }],
                        stream: true
                    });
        
                    let responseText = '';
        
                    for await (const part of streamResponse) {
                        responseText += part.message.content;
                    }
        
                    // Send final AI response after streaming completes
                    panel.webview.postMessage({ command: 'chatResponse', text: responseText, append: true });
                } catch (error) {
                    panel.webview.postMessage({ command: 'chatResponse', text: `Error: ${String(error)}`, append: true });
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
        margin: 0;
        padding: 0;
        background-color: #1e1e1e;
        color: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
    }
    .container {
        width: 90%;
        max-width: 500px;
        background: #252526;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    h2 {
        text-align: center;
        margin-bottom: 10px;
        color: #61dafb;
    }
    select, textarea, button {
        width: 100%;
        padding: 12px;
        border-radius: 5px;
        border: none;
        font-size: 14px;
        outline: none;
        box-sizing: border-box; /* Ensure padding is included in width */
    }
    select {
        background: #333;
        color: #fff;
    }
    textarea {
        background: #2d2d2d;
        color: #fff;
        resize: none;
        min-height: 60px; /* Set a minimum height for the textarea */
    }
    button {
        background: #007acc;
        color: white;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.3s ease;
        border: none;
    }
    button:hover {
        background: #005f99;
    }
    #response {
        background: #333;
        padding: 15px;
        border-radius: 5px;
        min-height: 100px;
        overflow-y: auto;
        max-height: 250px;
    }
    .message {
        margin: 5px 0;
        padding: 8px 12px;
        border-radius: 6px;
        width: fit-content;
        max-width: 90%;
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
            <select id="modelSelect">
                ${modelOptions}
            </select>
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
                messageElement.innerText = text;
                responseBox.appendChild(messageElement);
                responseBox.scrollTop = responseBox.scrollHeight;
            }

            window.addEventListener('message', function(event) {
    const command = event.data.command;
    const text = event.data.text;

    if (command === 'chatResponse') {
        // Check if the text contains "is thinking..." to avoid prefixing
        if (text.includes("is thinking...")) {
            appendMessage(text, "ai");
        } else {
            // Get the selected model name from the dropdown
            const modelSelect = document.getElementById('modelSelect');
            const selectedModel = modelSelect.options[modelSelect.selectedIndex].text;
            appendMessage(selectedModel + ": " + text, "ai"); // Using concatenation instead of backticks
        }
    }
});
        </script>
    </body>
    </html>
    `;
}

export function deactivate() {}
