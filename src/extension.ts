import * as vscode from 'vscode';
import ollama from 'ollama'

export function activate(context: vscode.ExtensionContext) {
	console.log("Ollama vscode extension is now active!");

	const disposable = vscode.commands.registerCommand('deepseek-vscode-chat.start', async () => {
		const panel = vscode.window.createWebviewPanel(
			'deepChat',
			'Deep Seek Chat',
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
				let responseText = '';

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
				} catch (error) {
					panel.webview.postMessage({ command: 'chatResponse', text: `Error: ${String(error)}` });
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
				background: #e8e8e8;
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
			<textarea id="prompt" rows="3" placeholder="Ask something..."></textarea>
			<button id="askBtn">Ask</button>
			<div id="response"></div>
		</div>

		<script>
			const vscode = acquireVsCodeApi();

			document.getElementById('askBtn').addEventListener('click', () => {
				const text = document.getElementById('prompt').value.trim();
				const model = document.getElementById('modelSelect').value;
				if (text && model) {
					document.getElementById('response').innerText = "Waiting for response...";
					vscode.postMessage({ command: 'chat', text, model });
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
