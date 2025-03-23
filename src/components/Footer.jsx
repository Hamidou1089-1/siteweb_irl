import { Link } from 'react-router-dom';

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div>
                        <h3 className="footer-title gradient-text">Hamidou Diallo</h3>
                        <p className="footer-description">
                            Étudiant en Ingénierie Financière à l'ENSIMAG,
                            passionné par les mathématiques appliquées et la finance quantitative.
                        </p>
                        <div className="social-links">
                            <a
                                href="https://linkedin.com/in/hamidou-diallo-842969217"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                                aria-label="LinkedIn"
                            >
                                <i className="fab fa-linkedin"></i>
                            </a>
                            <a
                                href="https://github.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                                aria-label="GitHub"
                            >
                                <i className="fab fa-github"></i>
                            </a>
                            <a
                                href="mailto:Hamidou.Diallo@grenoble-inp.org"
                                className="social-link"
                                aria-label="Email"
                            >
                                <i className="fas fa-envelope"></i>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="footer-title">Navigation</h3>
                        <ul className="footer-links">
                            <li className="footer-link">
                                <Link to="/">Accueil</Link>
                            </li>
                            <li className="footer-link">
                                <Link to="/about">À propos</Link>
                            </li>
                            <li className="footer-link">
                                <Link to="/projects">Projets</Link>
                            </li>
                            <li className="footer-link">
                                <Link to="/contact">Contact</Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="footer-title">Contact</h3>
                        <ul className="footer-links">
                            <li className="footer-link">
                                <a href="tel:+33758618251">+33 (7) 58 61 82 51</a>
                            </li>
                            <li className="footer-link">
                                <a href="mailto:Hamidou.Diallo@grenoble-inp.org">
                                    Hamidou.Diallo@grenoble-inp.org
                                </a>
                            </li>
                            <li className="footer-link">
                                ENSIMAG, Grenoble INP
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="copyright">
                        &copy; {currentYear} Hamidou Diallo. Tous droits réservés.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;