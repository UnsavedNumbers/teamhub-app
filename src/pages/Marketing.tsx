import { Link } from 'react-router-dom'

export default function Marketing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="px-6 py-24 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold mb-6 text-slate-900">
            YouthSports.team
          </h1>
          <p className="text-2xl text-slate-600 mb-4 font-light">
            A calm, parent-first platform for managing youth sports
          </p>
          <p className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto">
            Replace group chats, spreadsheets, Venmo requests, email chains, and paper forms.
            All in one simple place.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/portal/signup"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started
            </Link>
            <Link
              to="/portal/login"
              className="px-8 py-4 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold text-lg hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-slate-900">
            Everything you need, nothing you don't
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            {/* For Parents */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-blue-600 text-3xl">family_restroom</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-900">For Parents</h3>
              <ul className="text-left text-slate-600 space-y-3">
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  One place for schedules, payments, and updates
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  Clear next steps for every season
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  Easy RSVP and attendance
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  No digging through messages
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  No missed deadlines
                </li>
              </ul>
            </div>

            {/* For Coaches */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-blue-600 text-3xl">sports</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-900">For Coaches</h3>
              <ul className="text-left text-slate-600 space-y-3">
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  Clean rosters
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  Attendance visibility
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  Simple announcements
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  Less admin work
                </li>
              </ul>
            </div>

            {/* For Admins */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-blue-600 text-3xl">admin_panel_settings</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-slate-900">For Admins</h3>
              <ul className="text-left text-slate-600 space-y-3">
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  Payments tracked properly
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  Fewer questions from parents
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  Centralized team data
                </li>
                <li className="flex items-start">
                  <span className="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                  Multi-sport support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="px-6 py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8 text-slate-900">
            Built for everyone in youth sports
          </h2>
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-slate-900">Schools</h3>
              <p className="text-slate-600">Perfect for schools with multiple sports programs</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-slate-900">Clubs & AAU</h3>
              <p className="text-slate-600">Ideal for competitive club and AAU programs</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-slate-900">Academies</h3>
              <p className="text-slate-600">Built for sports academies and training centers</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-slate-900">Leagues</h3>
              <p className="text-slate-600">Designed for multi-team leagues and organizations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Promise Section */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-slate-900">
            The Promise
          </h2>
          <p className="text-2xl text-slate-600 font-light leading-relaxed">
            Parents open YouthSports.team for 5 seconds and know exactly what to do.
          </p>
          <p className="text-xl text-slate-500 mt-6">
            That is the product.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-white">
            Ready to simplify your sports management?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join schools, clubs, and academies already using YouthSports.team
          </p>
          <Link
            to="/portal/signup"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-slate-900 text-slate-400">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm">© 2024 YouthSports.team. All rights reserved.</p>
            </div>
            <div className="flex gap-6">
              <Link to="/portal/login" className="text-sm hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/portal/signup" className="text-sm hover:text-white transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
