import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Projects from './pages/Projects';
import Contact from './pages/Contact';
import QuantumOption from './pages/QuantumOption';
import OptionPricer from './pages/OptionPricer';
import './App.css';

// Import des icônes Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Ajout des icônes à la bibliothèque
library.add(fab, fas);

function App() {
    // Effet pour faire défiler vers le haut lors d'un changement de route
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <Router>
            <Navbar />
            <main>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/projects/quantum-option" element={<QuantumOption />} />
                    <Route path="/projects/option-pricer" element={<OptionPricer />} />
                    <Route path="/option-pricer" element={<OptionPricer />} />
                </Routes>
            </main>
            <Footer />
        </Router>
    );
}

export default App;