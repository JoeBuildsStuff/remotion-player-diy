# AGENTS.md

## Purpose

This repository uses shared design tokens and UI primitives.  
Do not introduce one-off styling systems or duplicate component patterns.

## Core UI Rules

- Use design-token classes for color and surfaces (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-secondary`, etc.).
- Do not introduce hardcoded palette classes for product UI (`zinc-*`, `gray-*`, `blue-*`, etc.) when tokenized equivalents exist.
- Reuse existing components in `src/components/ui` before creating new wrappers or primitives.
- Do not reinvent controls that already exist as standard components (for example `ButtonGroup`, `InputGroup`, shared `Button` + `Tooltip` patterns).
- Keep component behavior and styling consistent with existing editor UI patterns.

## Component Reuse Policy

Before adding a new UI abstraction:

1. Check `src/components/ui` for an existing primitive or composition.
2. If an existing primitive works with minor composition, use it instead of creating a new component.
3. Only add a new primitive when there is a documented gap; include a brief justification in the PR description.

## Styling Constraints

- Prefer semantic tokens over fixed color values.
- Prefer shared spacing, border radius, and typography conventions already present in editor components.
- Avoid local style rewrites that diverge from established patterns unless the change is intentionally part of a broader design migration.

## Pull Request Checklist (UI)

- [ ] Uses design-token classes rather than raw palette utilities.
- [ ] Reuses `src/components/ui` primitives where applicable.
- [ ] Does not introduce duplicate primitives for existing patterns.
- [ ] Keeps visual/interaction behavior consistent with adjacent editor components.
- [ ] Includes rationale when introducing any new shared UI primitive.

## For LLM-Assisted Changes

- Treat `src/components/ui` as the source of truth for primitives and composition patterns.
- Prefer adapting existing patterns over generating novel styling.
- If uncertain, choose consistency with existing code over visual novelty.
