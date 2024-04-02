# SKY-FE
Frontend for my website. Accessible here: https://softsky.site

Main focus of this website is to teach myself japanese and other little tools. Many subsystems called after Norse mythology, bare with it.

## Yggdrasil (authentication)
To access website you must first pass through Yggdrasil. Yggrasil gives you session which may include your authentication details. Authentication is not mundatory.

Yggdrasil protects website and users alike from bots and hackers.

## Mímir (Study)
Mímir is a SRS (Spaced Repetition System) study tool. Based on tool called Anki and tailored for learning Japanese language.

## Ginnungagap (File Storage)
Ginnungagap is a file storage. It allows users to upload any kind of file similar to Cloud Storage. Ginnungagap also can convert a bunch of file formats, optimize image and video files, and also serve files though direct link.

## Tíð (Planner tool)
Tíð is a planner tool. It allows to create events like any other planner tool out there but with minor additions. It has a feature to add geolocation to any event and even plan the road you need to take to get somethere. I used this to plan my visit to Japan. It really helps to plan a route to visit everything I want most effeciently.

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