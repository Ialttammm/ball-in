### TASK 19: Scaffold the Vite project `package.json`

1. **Inputs & Data Shapes:** Create these files with the exact contents in the control flow: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/style.css`. Do not add a README. Do not add dependencies beyond `typescript`, `vite`, and `vitest`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - Write `package.json`:
     - `name`: `gridiron-tactics`
     - `private`: true
     - `type`: `module`
     - scripts: `dev` = `vite`, `build` = `tsc --noEmit && vite build`, `test` = `vitest run`
     - `devDependencies`: `typescript` `^5.6.0`, `vite` `^5.4.0`, `vitest` `^2.1.0`
   - Write `tsconfig.json` compilerOptions: `target` `ES2022`, `module` `ESNext`, `moduleResolution` `bundler`, `strict` true, `noEmit` true, `skipLibCheck` true, `isolatedModules` true, `useDefineForClassFields` true, `lib` `['ES2022', 'DOM']`. `include` is `['src', 'tests']`.
   - Write `vite.config.ts`:
     - `import { defineConfig } from 'vitest/config'`
     - default export `defineConfig({ test: { include: ['tests/**/*.test.ts'] } })`
   - Write `index.html` with `lang="en"`, charset utf-8, viewport, title `Gridiron Tactics`, stylesheet `/src/style.css`, canvas `id="game"` width `1280` height `720`, module script `/src/main.ts`.
   - Write `src/style.css`:
     - `html, body { margin: 0; height: 100%; background: #0E1116; }`
     - `body { display: flex; align-items: center; justify-content: center; }`
     - `canvas { width: min(100vw, calc(100vh * 1280 / 720)); height: auto; background: #0E1116; }`

3. **Exact Mathematical Expressions:** Canvas CSS width is `min(100vw, 100vh * 1280 / 720)`. Hit testing divides by the CSS rect, so this scale does not change sim coordinates.

4. **Returns & Edge Cases:** `npm test` must be able to import the sim without a browser. DOM types exist only for `src/main.ts` and `src/render`. Tests import sim modules only.
