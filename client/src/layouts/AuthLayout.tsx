import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <Outlet />
    </div>
  );
}
