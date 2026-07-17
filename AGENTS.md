---
description: 
alwaysApply: true
---

---
description: 
alwaysApply: true
---

# Enhanced Project Documentation Automation

## Project Context

**Proyek ini**: ARKA PCR (Planned Component Replacement) — Web-based heavy equipment planned component replacement monitoring untuk operasional pertambangan.

**Sumber kebenaran desain**: `docs/maintenance-monitoring-system.md` — Gunakan dokumen ini sebagai referensi utama untuk domain PCR, arsitektur, model data, business rules, dan alur proses sistem.

**Stack**: Next.js (App Router), MySQL (Laragon), Prisma ORM, MinIO. Lihat `docs/maintenance-monitoring-system.md` untuk detail lengkap implementasi saat ini.

---

## Core Documentation Maintenance

After every significant code change, you MUST update the relevant documentation:

### Architecture Changes

When modifying system structure, components, or data flow:

1. Update `docs/architecture.md` with current state
2. Add/update Mermaid diagrams if data flow changed
3. Log architectural decisions in `docs/decisions.md`
4. Note any important discoveries in `MEMORY.md`

### Feature Development

When working on tasks:

1. Update progress in `docs/todo.md`
2. Move completed items to the "Recently Completed" section
3. Update `docs/backlog.md` if scope or priorities change
4. Document any technical decisions made

### Bug Fixes & Issues

When resolving problems:

1. Log the issue and solution in `MEMORY.md`
2. Update task status in `docs/todo.md`
3. Update architecture docs if the fix reveals structural changes

### Regular Maintenance

Periodically (when todo.md gets cluttered):

1. Archive old completed items from `docs/todo.md`
2. Move future ideas from todo to `docs/backlog.md`
3. Reprioritize based on what you've learned

## Documentation Standards

### Architecture Documentation

-   Document CURRENT state, not intended state
-   Include working code examples and patterns
-   Generate Mermaid diagrams for complex data flows
-   Reference specific files and functions when relevant

### Task Management

-   Include sufficient context for future AI assistance
-   Reference specific files, functions, and error messages
-   Update status and completion dates accurately
-   Note blockers and dependencies clearly
-   Keep focus on immediate work, move future ideas to backlog

### Memory Entries

-   Focus on significant decisions and learnings
-   Include actionable insights, not just descriptions
-   Keep entries concise but informative
-   Archive old entries when file gets too long

### Decision Records

-   Capture context that led to the decision
-   Document alternatives that were considered
-   Include implementation implications
-   Set review dates for revisiting decisions

## Cross-Referencing Rules

-   Always check existing documentation before adding new content
-   Link related decisions, tasks, and architecture changes
-   Update multiple files when changes affect multiple areas
-   Maintain consistency between memory, architecture, and task tracking

---

## Code Documentation (Comments in New Files)

When creating a **new file**, always include documentation in the form of **comments that are easy to understand**:

### File-level

- **At the top of the file**: a short block comment (or JSDoc) describing what the file does, its role in the app, and (if relevant) main inputs/outputs or API.
- Example: `/** Component Replacement Plan List — list, filter, export/import. */` or a 2–4 line description.

### Within the file

- **Constants / config**: one-line comment explaining purpose (e.g. "Map month name → number for import").
- **Important functions or handlers**: brief comment or JSDoc describing what they do and when they run (e.g. "Generate upcoming PCR window per unit", "Upsert by unit/part/year/month").
- **Non-obvious logic**: short inline or block comment so the "why" is clear.
- **UI sections**: optional section comments for large components (e.g. `{/* Filter: Project, Year, Month */}`).

### Style

- Use **Bahasa Indonesia or English** consistently per project/file.
- Prefer **clear, concise** wording over long paragraphs.
- Do **not** comment the obvious (e.g. "set state to true" without reason).

This applies to **new** files; when touching existing files, add or adjust comments only where they add real clarity.

Remember: These documents should provide comprehensive context for future development and AI assistance, evolving as living documentation that stays current with your codebase.
