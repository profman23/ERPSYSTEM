import './Header.css';

const Header = () => {
  return (
    <header className="header-container h-16 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="header-title text-lg font-semibold">
          Welcome Back
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="header-button px-4 py-2 text-sm transition-colors">
          Notifications
        </button>
        <div className="header-avatar w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
          U
        </div>
      </div>
    </header>
  );
};

export default Header;
