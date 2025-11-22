const Header = () => {
  return (
    <header className="h-16 bg-surface border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-heading font-semibold text-text">
          Welcome Back
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="px-4 py-2 text-sm text-text-secondary hover:text-text transition-colors">
          Notifications
        </button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
          U
        </div>
      </div>
    </header>
  );
};

export default Header;
