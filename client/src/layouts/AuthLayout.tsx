import { Outlet } from 'react-router-dom';

/**
 * AuthLayout - Minimal layout for authentication pages
 * Used for: /login, /register, /forgot-password, etc.
 * 
 * Features:
 * - Full viewport height
 * - Clean background
 * - Centered content
 * - RTL-ready
 */
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Outlet />
    </div>
  );
}
