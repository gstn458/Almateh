import About from './components/About';
import Clients from './components/Clients';
import Footer from './components/Footer';
import Hero from './components/Hero';
import Navbar from './components/Navbar';
import Services from './components/Services';
import Work from './components/Work';

export default function App() {
  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#0c1128] text-white selection:bg-blue-500/30">
      <Navbar />
      <main>
        <Hero />
        <Clients />
        <Services />
        <Work />
        <About />
      </main>
      <Footer />
    </div>
  );
}
