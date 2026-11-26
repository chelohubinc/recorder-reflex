# Recorder Reflex

Recorder Reflex is a web app for learning soprano recorder fingerings in C using the German fingering system and improving note-playing reflexes. It includes a nine-note reference, from C5 to D6, and exercises with or without microphone-based pitch detection.

## Features

- **Dashboard**: start an exercise and review your results.
- **Training**: identify the fingering for a note and submit your answer.
- **Note sequences**: take a timed challenge and confirm each note manually.
- **Reflex mode**: play the displayed note; the microphone detects its pitch and advances the exercise.
- **Microphone test**: see the detected note and its tuning deviation.
- **Learn**: explore fingerings for all nine reference notes.
- **Interactive recorder**: try fingerings by opening, covering, or half-covering the holes.
- **Progress**: review your answers, reaction times, and results by note.

Results are saved in your browser's local storage. They stay on this device and are not synced across devices. Audio features require microphone permission. Your browser must support the Web Audio API and `getUserMedia` (available on `localhost` or over HTTPS).

## Requirements

- Node.js **20.9 or later**
- npm

## Get started

```bash
npm ci
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the app for production. |
| `npm start` | Start the production server after running `npm run build`. |
| `npm run lint` | Check the code with ESLint. |
| `npm test` | Run the tests with Vitest. |
| `npm run test:watch` | Run Vitest in watch mode. |

## Project structure

```text
app/                  App pages, layout, and styles
components/recorder/  Interactive recorder components
features/audio/       Pitch detection and matching
features/music/       Notes and fingerings
features/progress/    Progress statistics
features/training/    Exercise logic
lib/                  Local persistence and shared utilities
docs/                 Musical references
public/               Icons and static assets
```

## Technologies

Next.js 16, React 19, TypeScript, Tailwind CSS, and Vitest.
