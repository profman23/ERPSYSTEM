const Sidebar = () => {
  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-heading font-bold text-primary">
          VetERP
        </h1>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <a
              href="/"
              className="block px-4 py-2 rounded-md text-text hover:bg-primary hover:text-white transition-all"
            >
              Dashboard
            </a>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-border">
        <p className="text-xs text-text-secondary">
          Phase 1 - Foundation Only
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
