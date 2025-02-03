# Ollama VSCode Chat

A Visual Studio Code extension that provides a user-friendly GUI for interacting with [Ollama](https://ollama.com), allowing you to select and chat with different local LLMs.

## Features

- Integrated chat interface within VSCode
- Easily switch between installed LLMs
- Simple and lightweight, leveraging local models

## Requirements

To use this extension, you need:

1. **Ollama** installed on your system  
2. At least one LLM installed via Ollama  

## **Usage**  

### **Open the Ollama Chat Panel**  
1. Press **`Ctrl + P`**, then type:  

```sh
> Ollama Chat
```

2. Select an installed LLM from the dropdown  
3. Start chatting!  

### **Download New LLMs**  
To install new models from Ollama directly through VSCode:  
1. Press **`Ctrl + P`**, then type:  

```sh
> Ollama Download New Model
```
2. Choose a model and download it. 

## Installation

### 1. Install Ollama

Ollama is required to run local models. Follow the instructions below to install it:

#### **Linux & macOS**
Run the following command in your terminal:

```sh
curl -fsSL https://ollama.com/install.sh | sh
```

#### **Windows**
Download and install [Ollama for Windows](https://ollama.com/download).

### 2. Install a Small LLM

After installing Ollama, you need at least one model to start chatting. Here are some lightweight models you can try:

```sh
ollama pull gemma
ollama pull mistral
ollama pull tiny-llama
```

### 3. Install the Extension

1. Open **VSCode**  
2. Go to **Extensions** (`Ctrl+Shift+X`)  
3. Search for `ollama-vscode-chat`  
4. Click **Install**  

## Usage

1. Open the **Ollama Chat** panel in VSCode  
2. Select an installed LLM from the dropdown  
3. Start chatting!  

## Screenshots

### Ollama Chat Interface in VSCode
![Ollama Chat Panel](https://i.ibb.co/cXDNzhz3/chat-panel.png)

### Selecting an LLM
![Model Selection](https://i.ibb.co/1GfqXJJN/model-selection.png)

## Notes

- Ensure Ollama is running before using the extension  
- If no models are found, install one using `ollama pull <model-name>`  

## License

MIT License
