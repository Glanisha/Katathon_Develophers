import { Link } from 'react-router-dom';
import { MapPin, Shield, AlertTriangle } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-blue-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-white text-3xl font-bold">SafeWalk</h1>
          <div className="space-x-4">
            <Link
              to="/login"
              className="text-gray-200 hover:text-white font-medium px-4 py-2 rounded-full transition"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-yellow-400 text-blue-900 px-6 py-2 rounded-full font-semibold hover:bg-yellow-300 transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="text-center max-w-2xl">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Walk Smart. Walk Safe.
          </h2>
          <p className="text-gray-200 text-lg mb-8">
            SafeWalk guides you with the safest & fastest routes, SOS emergency alerts, and friend monitoring so you're never alone.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-yellow-400 text-blue-900 px-8 py-3 rounded-full font-bold text-lg hover:bg-yellow-300 transition transform hover:scale-105"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-100 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Safest Route */}
            <div className="bg-white rounded-lg p-8 shadow-md text-center hover:shadow-lg transition">
              <div className="flex justify-center mb-4">
                <MapPin className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Safest Route</h3>
              <p className="text-gray-600">
                Find real time safe routes using safety data lighting, crowd density & danger alerts
              </p>
            </div>

            {/* Fastest Route */}
            <div className="bg-white rounded-lg p-8 shadow-md text-center hover:shadow-lg transition">
              <div className="flex justify-center mb-4">
                <Shield className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Fastest Route</h3>
              <p className="text-gray-600">
                Quickest paths with live updates. Ideal for saving time while staying safe
              </p>
            </div>

            {/* SOS Emergency */}
            <div className="bg-white rounded-lg p-8 shadow-md text-center hover:shadow-lg transition">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">SOS Emergency</h3>
              <p className="text-gray-600">
                Press the SOS button to instantly alert emergency contacts with your live location
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-blue-900 px-6 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-300 mb-4">Ready to walk safer?</p>
          <Link
            to="/signup"
            className="inline-block bg-yellow-400 text-blue-900 px-8 py-3 rounded-full font-bold hover:bg-yellow-300 transition"
          >
            Join SafeWalk Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;