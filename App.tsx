
import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import WhyChooseUs from './components/WhyChooseUs';
import Testimonials from './components/Testimonials';
import About from './components/About';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="font-sans text-gray-800 bg-premium-dark min-h-screen relative overflow-x-hidden">
      {/* Global Steam Background */}
      {/* Global Steam Background */}
      <div className="steam-container">
        <div className="fog-container">
          <div className="fog-img"></div>
          <div className="fog-img-2"></div>
        </div>
        <div className="steam-vent" style={{ left: '20%', animationDelay: '0s' }}></div>
        <div className="steam-vent" style={{ left: '50%', animationDelay: '2s' }}></div>
        <div className="steam-vent" style={{ left: '80%', animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <Services />
          <WhyChooseUs />
          <About />
          <Testimonials />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default App;
