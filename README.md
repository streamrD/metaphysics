# Essays on Metaphysics

A minimalist, Zen-inspired digital library of metaphysical essays with interactive slide carousels.

## Features
- **Dynamic Index**: Automatically parses `public/essays.html` to populate the library.
- **Reading Mode**: Fetches and formats essay content directly from Google Docs.
- **Interactive Slides**: Swipeable/draggable image carousels for each essay.
- **Minimalist Design**: Built with Tailwind CSS and Framer Motion for a smooth, focused experience.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- npm (comes with Node.js)

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

## Adding New Essays
To add a new essay to the library:
1. Open `public/essays.html`.
2. Add a new `<div class="essay-card">` with your essay details (title, Google Doc link, date, etc.).
3. The app will automatically detect and display the new entry.
4. Ensure your Google Doc is "Published to the Web" or shared with "Anyone with the link can view" for the text fetcher to work.

## Project Structure
- `src/App.tsx`: Main application logic and UI.
- `public/essays.html`: The data source for the essay library.
- `public/slides/`: Folder for slide images (organized by `imageFolder` name).
