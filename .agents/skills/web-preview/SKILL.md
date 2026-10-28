---
name: web-preview
description: Triggers whenever the user says "web" or requests to preview/open the local website. Starts the local HTTP preview server on port 8000 if not already running, and displays the direct localhost link to view inside Antigravity's built-in side-panel browser without opening Chrome.
---

# Web Preview Skill

Use this skill whenever the user says **"web"** (or requests to launch/view the local preview server).

## Procedure

1. **Check if Local Server is Running**:
   - Check if port 8000 is already active:
     ```bash
     lsof -i :8000
     ```

2. **Start the Server if Not Running**:
   - If port 8000 is free, start the local server as a background daemon process:
     ```bash
     python3 -m http.server 8000
     ```
     *(Set `IsDaemon: true` and `WaitMsBeforeAsync: 1500`)*

3. **DO NOT Open External Chrome**:
   - **Crucial**: Do **NOT** run `open http://localhost:8000` in the terminal. Calling `open` invokes macOS's default handler and opens the URL externally in Google Chrome.

4. **Provide the Built-In Browser Link in Chat**:
   - Output the clickable link prominently in your chat response:
     ```markdown
     👉 [http://localhost:8000](http://localhost:8000) (or [http://localhost:8000/index.html](http://localhost:8000/index.html))
     ```
   - In Antigravity, clicking any web link in an agent response opens it directly inside Antigravity's built-in browser side panel next to the chat, rather than opening an external browser tab.
