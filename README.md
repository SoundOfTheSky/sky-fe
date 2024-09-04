# Sky - frontend
Frontend for my website. Accessible here: https://soft-sky.ru

Main focus of this website is to teach myself japanese and other little tools.

## Stack
- NodeJS
- Vite
- SolidJS
- TypeBox

## Notable stuff
- WebAuthn authentication
- WebSocket
- True PWA
- Works fully offline! Synchronizes with server when back online.

## Code & style
This project uses SolidJS to render page. SolidJS is a frontend framework similar to React.

### Linters
1. Prettier - basic code style
2. ESLint - code analyze and style (prettier integrated)
3. Stylelint - stylsheet analyze and style

### Imports
Please use global imports and follow the order:
1. Package imports
2. Global imports
3. Relative imports
4. Style and other imports
5. SolidJS attributes (needed for bundler)

### Components
Basic structure:
1. Hooks - imports, contexts, initialization
2. State - atoms, signals, variables
3. Memos - variables which state is dependent on another variable
4. Effects - effects that shoot after a variable change. Must have comments.
5. Functions - all functions.
   - Functions that used as effects (reactive)
   - Basic function with `untrack()`
   - Handlers
6. Render - everything directly related

### Modularity
This project uses modules. Every module must incapsulate it's own features, including:
1. Routing
2. Components
3. Outlets
4. Styles
5. Context (Do not use `createRoot()` in modules)

Directory structure may be anything you want, but be reasonable. Also it will be really cool to include a README to every module.