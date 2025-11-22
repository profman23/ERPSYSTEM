const ForgotPasswordPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-md p-8 bg-surface rounded-lg shadow-lg border border-border">
        <h1 className="text-2xl font-heading font-bold text-text mb-6 text-center">
          Reset Password
        </h1>
        
        <p className="text-sm text-text-secondary mb-6 text-center">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Email
            </label>
            <input
              type="email"
              className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your email"
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Send Reset Link
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-primary hover:underline">
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
