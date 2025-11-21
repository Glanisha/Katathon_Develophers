import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen  flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-white text-3xl font-bold">SafeWalk</h1>
          <div className="space-x-4">
            <Link
              to="/login"
              className="text-white hover:text-gray-200 font-medium"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-white text-indigo-600 px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <>yo</>
    </div>
  );
};

export default LandingPage;