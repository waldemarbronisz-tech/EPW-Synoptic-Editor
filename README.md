# EPW Synoptic Editor

Professional industrial HMI/SCADA synoptic editor for EPW OS. Inspired by SimCity 2000 engineering workflow, featuring drag-and-drop process design, real-time visualization, and seamless integration with EPW Logic Studio and Runtime.

## Overview
EPW Synoptic Editor is a standalone application responsible ONLY for EDITING `.epwsyn` project files. It does not handle runtime execution, Modbus communication, or logic gates—those are handled by EPW OS Synoptic Runtime and EPW Logic Studio.

## Prerequisites
- Node.js (v22.22 or higher, compatible with current Vite version)
- NPM

## How to Start (Windows)
Double-click `START_EPW_SYNOPTIC.bat`. This script will:
1. Verify Node.js is installed.
2. Automatically run `npm install` if dependencies are missing.
3. Start the application locally and open it in your default web browser (typically `http://127.0.0.1:5173`).

## How to Start (Manually)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## How to Build
To build the application for production, run:
```bash
npm run build
```

## .epwsyn File Format
The editor saves projects in `.epwsyn` format, which is a pure JSON schema that holds the application drawing and logic bindings but contains no executable code.

## Current Project Status
- Complete functional UI inspired by 1998 industrial engineering software.
- Full drag-and-drop functionality with infinite canvas.
- Project loading and saving logic decoupled into a proper ProjectManager layer.
- Responsive resizable panels and property inspectors.
