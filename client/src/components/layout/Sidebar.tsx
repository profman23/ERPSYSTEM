import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar-container w-64 flex flex-col">
      <div className="sidebar-header p-6">
        <h1 className="sidebar-logo text-xl font-bold">
          VetERP
        </h1>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <a href="/" className="sidebar-item block px-4 py-2 rounded-md transition-all">
              Dashboard
            </a>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer p-4">
        <p className="text-xs sidebar-footer-text">
          Phase 1 - Foundation Only
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
