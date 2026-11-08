import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import App from './App.tsx';
import './index.css';
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from './api/clerkConfig';

// Con VITE_CLERK_PUBLISHABLE_KEY impostata l'accesso passa da Clerk; senza, resta il login interno.
const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {CLERK_ENABLED ? (
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        appearance={{ baseTheme: dark, variables: { colorPrimary: '#BEF23C', colorBackground: '#12161D', colorText: '#F0F3F8', colorInputBackground: '#0F131A', borderRadius: '0.5rem', fontFamily: 'Geist, system-ui, sans-serif' } }}
      >
        {app}
      </ClerkProvider>
    ) : app}
  </StrictMode>
);
