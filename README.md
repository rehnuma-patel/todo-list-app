# To-Do List App

A task management web app built with HTML, CSS and JavaScript. You can add, view, edit, complete and delete tasks, and they are saved in the browser with `localStorage`.

🌐 **Live demo:** https://rehnuma-patel.github.io/todo-list-app/

## Features
- **Add** tasks with a priority (low / medium / high) and an optional due date
- **View** tasks with All / Active / Done filters, live counts and search
- **Edit** tasks inline (pen button or double-click; Enter saves, Esc cancels)
- **Complete** tasks with a checkbox; a progress bar shows how many are done
- **Delete** tasks with a 5-second Undo, plus "Clear completed"
- **Saved across sessions** with `window.localStorage` (synced between open tabs)
- Overdue and due-today highlighting
- Dark / light theme, responsive layout, keyboard friendly

## How it works
- Each task is stored as a structured object: `{ id, text, completed, priority, dueDate, createdAt }`
- The task array is saved to `localStorage` as JSON after every change and loaded (and validated) when the page opens
- The list is rebuilt with DOM methods (`<template>`, `cloneNode`, `textContent`) so user input is never inserted as HTML
- One click/change listener on the list handles every task (event delegation)

## Run locally
Open `index.html` in a browser, or use the VS Code **Live Server** extension.

## Tech
HTML5 · CSS3 · JavaScript (ES6) · DOM Manipulation · Web Storage API
