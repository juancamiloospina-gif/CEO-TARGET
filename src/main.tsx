import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminPanel from './AdminPanel.tsx';
import './index.css';

// Panel interno oculto: solo se monta con ?admin=1 en la URL. Nunca hay un
// enlace visible hacia el desde la app publica.
const isAdminRoute = new URLSearchParams(window.location.search).get('admin') === '1';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute ? <AdminPanel /> : <App />}
  </StrictMode>
);
