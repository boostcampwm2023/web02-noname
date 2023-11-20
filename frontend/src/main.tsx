import './styles/index.css';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import router from './route/router';

async function enableMocking() {
  if (import.meta.env.VITE_NODE_ENV !== 'development') {
    return;
  }

  const { worker } = await import('./mocks/browser');

  // eslint-disable-next-line consistent-return
  return worker.start();
}

const queryClient = new QueryClient();

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
});
