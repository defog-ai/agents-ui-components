# CLAUDE.md - Agents UI Components Guide

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run storybook` - Run Storybook for component docs

## Formatting
- Run `pnpm format` after every change to ensure consistent code formatting with Prettier

## Test Commands
- `npx playwright test` - Run all tests headlessly
- `npx playwright test --headed` - Run tests with visible browser
- `npx playwright test path/to/test.spec.ts` - Run specific test file
- `npx playwright test --ui` - Open Playwright UI for manual testing

## Code Style Guidelines
- **TypeScript**: Use strict typing when possible (strict mode enabled)
- **React**: Functional components with hooks preferred over class components
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Components**: Keep components small and focused on a single responsibility
- **Imports**: Group imports by type (React, libraries, local components, styles)
- **File Organization**: Group related components in feature-based directories
- **Error Handling**: Use proper error boundaries and fallbacks
- **CSS**: Use SCSS and Tailwind for styling with consistent naming conventions
- **Testing**: Write meaningful tests that verify component behavior

## Export Pattern
Components should be exported properly via entry points in the lib directory 
to ensure they can be imported by consumers via the package exports.