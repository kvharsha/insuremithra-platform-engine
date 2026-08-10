import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import PolicyPurchase from './pages/PolicyPurchase';
import PolicyRenewal from './pages/PolicyRenewal';
import ClaimSubmit from './pages/ClaimSubmit';
import PolicyDetails from './pages/PolicyDetails';
import MyPurchases from './pages/MyPurchases';
import Policies from './pages/Policies';
import PolicySearch from './pages/PolicySearch';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { AuthProvider } from './contexts/AuthContext';

jest.setTimeout(30000);

describe('Bulk coverage smoke tests', () => {
  // Simple mount tests: ensure components render without throwing.
  const mount = async (ui: React.ReactElement) => {
    const { container } = render(ui);
    // wait for any async effects to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(container.firstChild).not.toBeNull();
  };

  test('App mounts', async () => {
    await mount(<App />);
  });

  test('PolicyPurchase mounts', async () => {
    await mount(
      <AuthProvider>
        <MemoryRouter initialEntries={["/policy/p1"]}>
          <PolicyPurchase />
        </MemoryRouter>
      </AuthProvider>
    );
  });

  test('PolicyRenewal mounts', async () => {
    await mount(
      <AuthProvider>
        <MemoryRouter initialEntries={["/renewal/p1"]}>
          <PolicyRenewal />
        </MemoryRouter>
      </AuthProvider>
    );
  });

  test('ClaimSubmit mounts', async () => {
    await mount(
      <AuthProvider>
        <MemoryRouter>
          <ClaimSubmit />
        </MemoryRouter>
      </AuthProvider>
    );
  });

  test('PolicyDetails mounts', async () => {
    await mount(
      <AuthProvider>
        <MemoryRouter initialEntries={["/policy/details/p1"]}>
          <PolicyDetails />
        </MemoryRouter>
      </AuthProvider>
    );
  });

  test('MyPurchases, Policies, PolicySearch mount', async () => {
    await mount(
      <AuthProvider>
        <MemoryRouter>
          <MyPurchases />
        </MemoryRouter>
      </AuthProvider>
    );
    await mount(
      <AuthProvider>
        <MemoryRouter>
          <Policies />
        </MemoryRouter>
      </AuthProvider>
    );
    await mount(
      <AuthProvider>
        <MemoryRouter>
          <PolicySearch />
        </MemoryRouter>
      </AuthProvider>
    );
  });

  test('Auth pages and Dashboard mount', async () => {
    await mount(
      <AuthProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthProvider>
    );
    await mount(
      <AuthProvider>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </AuthProvider>
    );
    await mount(
      <AuthProvider>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </AuthProvider>
    );
  });
});
