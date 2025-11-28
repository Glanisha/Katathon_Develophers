import { Link } from "react-router-dom";
import { ShieldCheck, Map, PhoneCall, Users, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { MapPin, Shield, AlertTriangle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white flex flex-col">
      {/* Navbar */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-4xl font-extrabold tracking-wide">SafeWalk</h1>
          <div className="space-x-4">
            <Link
              to="/login"
              className="bg-white text-indigo-700 px-6 py-2 rounded-full font-semibold hover:bg-gray-200 transition"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-white text-indigo-700 px-6 py-2 rounded-full font-semibold hover:bg-gray-200 transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center text-center px-6">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-extrabold mb-6"
        >
          Walk Smart. Walk Safe.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg md:text-xl max-w-2xl mb-10 opacity-90"
        >
          SafeWalk guides you with the safest & fastest routes, SOS emergency alerts, and friend monitoring so you're never alone.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Link
            to="/signup"
            className="bg-yellow-400 text-black px-10 py-4 rounded-full text-xl font-bold hover:bg-yellow-300 transition shadow-lg"
          >
            Get Started
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white text-gray-800 rounded-t-3xl mt-20 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          {/* Safe Route */}
          <div className="p-8 bg-gray-50 rounded-2xl shadow-md hover:shadow-xl flex flex-col items-center text-center transition">
            <Map className="w-14 h-14 mb-4 text-indigo-600" />
            <h3 className="text-2xl font-bold mb-2">Safest Route</h3>
            <p className="opacity-80">Find real‑time safe routes using safety data, lighting, crowd density & danger alerts.</p>
          </div>

          {/* Fastest Route */}
          <div className="p-8 bg-gray-50 rounded-2xl shadow-md hover:shadow-xl flex flex-col items-center text-center transition">
            <ShieldCheck className="w-14 h-14 mb-4 text-green-600" />
            <h3 className="text-2xl font-bold mb-2">Fastest Route</h3>
            <p className="opacity-80">Quickest paths with live updates, ideal for saving time while staying safe.</p>
          </div>

          {/* SOS */}
          <div className="p-8 bg-gray-50 rounded-2xl shadow-md hover:shadow-xl flex flex-col items-center text-center transition">
            <AlertTriangle className="w-14 h-14 mb-4 text-red-600" />
            <h3 className="text-2xl font-bold mb-2">SOS Emergency</h3>
            <p className="opacity-80">Press the SOS button to instantly alert emergency contacts with your live location.</p>
          </div>
        </div>
      </section>

      {/* Friends Feature */}
      <section className="py-20 bg-gray-100 text-gray-800">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-4xl font-extrabold mb-4">Stay Connected</h3>
            <p className="text-lg opacity-80 mb-6">
              Add and manage trusted friends, share routes, and let them track your walk for extra safety.
            </p>
            <Link
              to="/signup"
              className="bg-indigo-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-indigo-500 transition"
            >
              Create Account
            </Link>
          </div>

          <div className="flex justify-center">
            <div className="p-10 bg-white rounded-3xl shadow-xl w-full max-w-sm text-center">
              <Users className="w-20 h-20 mx-auto mb-4 text-indigo-600" />
              <h4 className="text-2xl font-bold mb-2">Friend System</h4>
              <p className="opacity-80">Send friend requests & share your journey in real‑time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-indigo-900 text-center py-6 text-sm opacity-80">© 2025 SafeWalk. Stay Safe Everywhere.</footer>
    </div>
  );
}
