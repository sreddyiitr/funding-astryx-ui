import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@astryxdesign/core/theme';
import {themes, defaultThemeSlug, themeModes} from './astryx-themes';
import './globals.css';
import App from './App';

if (import.meta.env.DEV) {
  // Dev-only: StyleX CSS for our own stylex.create() calls, with HMR.
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/virtual:stylex.css';
  document.head.appendChild(link);
  import('virtual:stylex:runtime' as string);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={themes[defaultThemeSlug]} mode={themeModes[defaultThemeSlug] as 'light' | 'dark'}>
      <App />
    </Theme>
  </StrictMode>,
);
