
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
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-cyan rounded-full mix-blend-screen filter blur-[128px] animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-blue rounded-full mix-blend-screen filter blur-[128px] animate-float" style={{ animationDelay: '2s' }}></div>
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
