# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This project is in early setup — no source code, build system, or tests exist yet. The tech stack below is inferred from the configured AI rules.

## Tech Stack

- **Backend**: ASP.NET Core (.NET 8+), C# 12+, Entity Framework Core
- **Frontend**: Vue 3 with Composition API (`<script setup lang="ts">`), TypeScript, Pinia for state management, TailwindCSS or Scoped SCSS
- **Logging**: Serilog (via `ILogger`)

## Coding Standards

These are drawn from the project's `.claude/rules/`, `.cursor/rules/`, and `.trae/rules/` files.

### General (all code)

- Follow SOLID, DRY, KISS principles. Methods over 50 lines should be split.
- No magic numbers or hardcoded strings. Variables and methods must be self-documenting.
- Always handle null references, empty collections, and network errors. Never use empty catch blocks — log the error.
- Avoid redundant comments (e.g., `// Get user` above `GetUser()`). Only write `Why`-level comments for non-obvious logic.
- When editing existing code, match the file's indentation, naming style, and avoid unrelated refactors.

### Backend (C# / ASP.NET Core)

- Enable nullable reference types (`<Nullable>enable</Nullable>`).
- All I/O must be async — never use `.Result` or `.Wait()`.
- Use constructor-based dependency injection exclusively.
- Use structured logging (`ILogger`) for all exception and diagnostic output.
- RESTful APIs with consistent response formats. Prefer Controller-based or Minimal API patterns.

### Frontend (Vue 3 / TypeScript)

- Strictly use `<script setup lang="ts">` and Composition API.
- All Props, Emits, and API return values must have explicit TypeScript interfaces — no `any`.
- Use Pinia for shared state; prefer Composables over global state where possible.
- Avoid deep prop drilling — use Provide/Inject instead.
- Follow BEM naming for custom CSS when not using TailwindCSS.

## Git Workflow

- Commit messages use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`. Write commit descriptions in **Chinese**.
- Before committing: review with `git status` and `git diff`, remove debug artifacts (e.g., `console.log`, `Console.WriteLine`).
- Before pushing: `git pull --rebase` first. If a conflict arises, stop and report the conflicting files.
