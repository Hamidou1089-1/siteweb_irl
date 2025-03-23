import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();

    // Change navbar style on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Check if link is active
    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
            <div className="container">
                <nav className="navbar">
                    <Link to="/" className="nav-logo gradient-text">Hamidou Diallo</Link>

                    <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
                        <Link
                            to="/"
                            className={`nav-link ${isActive('/') ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                        >
                            Accueil
                        </Link>
                        <Link
                            to="/about"
                            className={`nav-link ${isActive('/about') ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                        >
                            À propos
                        </Link>
                        <Link
                            to="/projects"
                            className={`nav-link ${isActive('/projects') ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                        >
                            Projets
                        </Link>
                        <Link
                            to="/contact"
                            className={`nav-link ${isActive('/contact') ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                        >
                            Contact
                        </Link>
                    </div>

                    <button
                        className="mobile-menu-btn"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Menu de navigation"
                    >
                        {menuOpen ? '✕' : '☰'}
                    </button>
                </nav>
            </div>
        </header>
    );
}

export default Navbar;