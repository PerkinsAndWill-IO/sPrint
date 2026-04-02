# CLAUDE.md

## UI Development

- Before reaching for third-party composables or custom implementations for UI features (virtual lists, scroll areas, modals, etc.), always check Nuxt UI components first using the `mcp__nuxt-ui-remote` tools. Nuxt UI components are already integrated, themed, and handle edge cases (e.g. `UScrollArea` with `virtualize` instead of VueUse's `useVirtualList`).
