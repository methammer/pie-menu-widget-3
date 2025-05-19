```markdown
# React + TypeScript + Vite + Shadcn UI Radial Menu

This project implements an advanced draggable radial menu with orbital items that dynamically adjust their positions.

## Features
- Draggable central button.
- Orbital items that appear around the central button.
- Dynamic "relaxation" algorithm for item positioning to avoid overlaps and screen edges.
- Items scale on hover, triggering layout recalculation.
- Built with React, TypeScript, Vite, Shadcn UI (for utility classes and theming conventions), and Framer Motion for animations.

## Development

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+ recommended)

### Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Server
```bash
npm run dev
```
This will start the Vite development server, typically on `http://localhost:5173`.

### Building for Production
```bash
npm run build
```
This command bundles the application into the `dist` directory.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
// eslint.config.js
// Make sure to run `npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin`
// if you haven't already for type-aware linting.
// The template might already include parts of this.

import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Previous configs...
  {
    // files: ['**/*.{ts,tsx}'], // Ensure this targets your TS/TSX files
    // languageOptions: {
    //   parserOptions: {
    //     project: ['./tsconfig.json', './tsconfig.node.json'], // Adjust paths as needed
    //     tsconfigRootDir: import.meta.dirname,
    //   },
    // },
    // ...tseslint.configs.recommendedTypeChecked, // Or strictTypeChecked
    // ...tseslint.configs.stylisticTypeChecked, // Optional
  }
  // ...
);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
// import reactX from 'eslint-plugin-react-x'
// import reactDom from 'eslint-plugin-react-dom'

// export default tseslint.config({
//   plugins: {
//     // Add the react-x and react-dom plugins
//     'react-x': reactX,
//     'react-dom': reactDom,
//   },
//   rules: {
//     // other rules...
//     // Enable its recommended typescript rules
//     ...reactX.configs['recommended-typescript'].rules,
//     ...reactDom.configs.recommended.rules,
//   },
// })
```

## Deployment to Netlify

This project can be easily deployed to Netlify.

### Steps:

1.  **Push your code to a Git provider:**
    *   Create a new repository on GitHub, GitLab, or Bitbucket.
    *   Initialize a git repository in your local project folder:
        ```bash
        git init
        git add .
        git commit -m "Initial commit"
        ```
    *   Add the remote repository and push your code:
        ```bash
        git remote add origin <your-repository-url>
        git branch -M main
        git push -u origin main
        ```

2.  **Connect your Git repository to Netlify:**
    *   Log in to your Netlify account.
    *   Click on "Add new site" (or "Sites" then "Add new site") and choose "Import an existing project".
    *   Connect to your Git provider (GitHub, GitLab, Bitbucket).
    *   Select the repository you just pushed.

3.  **Configure Build Settings (if not using `netlify.toml` or to override):**
    *   **Branch to deploy:** `main` (or your primary branch).
    *   **Build command:** `npm run build`
    *   **Publish directory:** `dist`

    If you've included the `netlify.toml` file in your repository, Netlify should automatically pick up these settings.

4.  **Deploy:**
    *   Click "Deploy site". Netlify will pull your code, run the build command, and deploy the contents of the `dist` directory.

The `netlify.toml` file included in this project already specifies the correct build command and publish directory. The redirect rule `/* /index.html 200` is important for single-page applications (SPAs) like this one, ensuring that all routes are handled by your `index.html` file.
```
