# PerlerBeadsPindou Vite Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the initial Vite + React + TypeScript project skeleton for a local-only perler bead image generator.

**Architecture:** The first task creates a testable single-page workbench shell. Later feature work will keep image processing in framework-independent `src/core/*` modules and UI in `src/components/*`.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, jsdom.

## Global Constraints

- Work only under `/Users/bytedance/go/src/study/PerlerBeadsPindou`.
- First version focuses on upload, settings, preview, color stats, and export entry points.
- User images and generated bead data stay in browser memory only.
- Follow test-first changes for behavior.

---

### Task 1: Project Skeleton And Workbench Shell

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/vite-env.d.ts`
- Create: `src/App.test.tsx`
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `src/styles.css`
- Modify: `README.md`

**Interfaces:**
- Produces: `App` React component as the initial workbench shell.
- Produces: npm scripts `dev`, `build`, `preview`, `test`.

- [ ] **Step 1: Add project config and failing workbench test.**
- [ ] **Step 2: Run `npm test -- --run` and confirm the test fails before `App` exists.**
- [ ] **Step 3: Implement the minimal React workbench shell and responsive CSS.**
- [ ] **Step 4: Run `npm test -- --run` and confirm tests pass.**
- [ ] **Step 5: Run `npm run build` and confirm the production build succeeds.**
- [ ] **Step 6: Start `npm run dev -- --host 127.0.0.1` and report the local URL.**
