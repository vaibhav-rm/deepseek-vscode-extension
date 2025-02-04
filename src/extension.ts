import * as vscode from 'vscode';
import ollama from 'ollama';

class ThreadProvider implements vscode.TreeDataProvider<ChatThread> {
    private _onDidChangeTreeData: vscode.EventEmitter<ChatThread | undefined> = new vscode.EventEmitter<ChatThread | undefined>();
    readonly onDidChangeTreeData: vscode.Event<ChatThread | undefined> = this._onDidChangeTreeData.event;

    private threads: ChatThread[] = [];

    constructor() {
        // Initialize with a default thread
        this.addThread('General Chat');
    }

    getTreeItem(element: ChatThread): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ChatThread): Thenable<ChatThread[]> {
        return Promise.resolve(this.threads);
    }

    addThread(threadName: string) {
        if (threadName) { // Ensure threadName is not empty
            const newThread = new ChatThread(threadName);
            this.threads.push(newThread);
            this._onDidChangeTreeData.fire();
        } else {
            console.error("Thread name cannot be empty");
        }
    }

    getThread(threadName: string): ChatThread | undefined {
        return this.threads.find(thread => thread.label === threadName);
    }

    // Public method to get the thread names
    public getThreadNames(): string[] {
        return this.threads.map(thread => thread.label);
    }
}

class ChatThread extends vscode.TreeItem {
    constructor(public readonly label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
    }
}

const threadProvider = new ThreadProvider();

export function activate(context: vscode.ExtensionContext) {
    console.log("Ollama vscode extension is now active!");

    // Create the sidebar view
    const treeView = vscode.window.createTreeView('ollamaChatThreads', { treeDataProvider: threadProvider });

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

        panel.webview.html = getWebViewContent(models, threadProvider.getThreadNames());

        panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === 'chat') {
                const { text, model, threadName } = message;
                let responseText = '';

                // Add user message to the selected thread
                const thread = threadProvider.getThread(threadName);
                if (thread) {
                    // Here you can store the message in the thread (not implemented in this example)
                }

                try {
                    const streamResponse = await ollama.chat({
                        model: model,
                        messages: [{ role: 'user', content: text }],
                        stream: true
                    });

                    for await (const part of streamResponse) {
                        responseText += part.message.content;
                        panel.webview.postMessage({ command: 'chatResponse', text: responseText });
                    }

                    // Add AI response to the selected thread (not implemented in this example)
                } catch (error) {
                    panel.webview.postMessage({ command: 'chatResponse', text: `Error: ${String(error)}` });
                }
            }
        });

        context.subscriptions.push(panel);
    });

    context.subscriptions.push(disposable);
}

function getWebViewContent(models: string[], threads: string[]): string {
    const modelOptions = models.map(m => `<option value="${m}">${m}</option>`).join('');
    const threadOptions = threads.map(t => `<option value="${t}">${t}</option>`).join('');

    return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                background-color: #f4f4f4;
                color: #333;
            }
            .container {
                max-width: 600px;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            }
            select, textarea, button {
                width: 100%;
                margin-top: 10px;
                padding: 10px;
                border-radius: 5px;
                border: 1px solid #ccc;
            }
            button {
                background: #007acc;
                color: white;
                border: none;
                cursor: pointer;
                transition: background 0.3s ease;
            }
            button:hover {
                background: #005f99;
            }
            #response {
                margin-top: 15px;
                padding: 10px;
                background: #e8 e8e8;
                border-radius: 5px;
                min-height: 50px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Ollama VS Code Extension</h2>
            <label for="modelSelect">Select Model:</label>
            <select id="modelSelect">
                ${modelOptions}
            </select>
            <label for="threadSelect">Select Thread:</label>
            <select id="threadSelect">
                ${threadOptions}
            </select>
            <textarea id="prompt" rows="3" placeholder="Ask something..."></textarea>
            <button id="askBtn">Ask</button>
            <div id="response"></div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('askBtn').addEventListener('click', () => {
                const text = document.getElementById('prompt').value.trim();
                const model = document.getElementById('modelSelect').value;
                const thread = document.getElementById('threadSelect').value;
                if (text && model && thread) {
                    document.getElementById('response').innerText = "Waiting for response...";
                    vscode.postMessage({ command: 'chat', text, model, threadName: thread });
                }
            });

            window.addEventListener('message', event => {
                const { command, text } = event.data;
                if (command === 'chatResponse') {
                    document.getElementById('response').innerText = text;
                }
            });
        </script>
    </body>
    </html>
    `;
}

export function deactivate() {}