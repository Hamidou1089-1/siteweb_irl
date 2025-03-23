import { Link } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';

function Home() {
    // Projet récent (à compléter avec d'autres projets)
    const featuredProject = {
        title: "Pricing d'Option Européenne par Méthodes Quantiques",
        description: "Implémentation d'un algorithme quantique pour le pricing d'options européennes Call, utilisant les méthodes de simulation Monte Carlo.",
        tags: ["Finance Quantitative", "Informatique Quantique", "Python", "Qiskit"],
        link: "/projects/quantum-option"
    };

    return (
        <>
            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Bonjour, je suis <span className="gradient-text">Hamidou Diallo</span>
                        </h1>
                        <p className="hero-subtitle">
                            Étudiant en Ingénierie Financière à l'ENSIMAG-INP, stagiaire à l'INRIA
                            dans l'équipe Polaris, passionné par la finance quantitative et les
                            mathématiques appliquées.
                        </p>
                        <div className="hero-buttons">
                            <Link to="/projects" className="btn-primary">
                                Voir mes projets
                            </Link>
                            <Link to="/contact" className="btn-secondary">
                                Me contacter
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section (Aperçu) */}
            <section className="section">
                <div className="container">
                    <h2 className="section-title">À Propos</h2>
                    <div className="about-grid">
                        <div>
                            <p style={{marginTop: '2rem'}}>
                                Actuellement en deuxième année à Grenoble INP-ENSIMAG, je me
                                spécialise en Ingénierie Financière. Je suis passionné par l'application
                                des mathématiques et de l'informatique dans le domaine de la finance.
                            </p>
                            <p style={{marginTop: '2rem'}}>
                                Je poursuis actuellement un stage à l'INRIA dans l'équipe Polaris,
                                encadré par Nicolas Gast, Frederica Garin et Paolo Fresca, où je
                                travaille sur la modélisation mathématique de réseaux complexes.
                            </p>
                            <div style={{marginTop: '2rem'}}>
                                <Link to="/about" className="btn-secondary">
                                    En savoir plus
                                </Link>
                            </div>
                        </div>
                        <div className="about-image">
                            <img
                                src="/src/assets/profile.png"
                                alt="Hamidou Diallo"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Latest Project Section */}
            <section className="section" style={{ background: 'var(--color-background)' }}>
                <div className="container">
                    <h2 className="section-title">Projet Récent</h2>
                    <div className="projects-grid">
                        <ProjectCard project={featuredProject} />
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <Link to="/projects" className="btn-primary">
                            Voir tous les projets
                        </Link>
                    </div>
                </div>
            </section>

            {/* Contact CTA */}
            <section className="section gradient-bg" style={{ color: 'white' }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <h2>Intéressé par mon profil ?</h2>
                    <p style={{ marginBottom: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                        N'hésitez pas à me contacter pour discuter de collaborations,
                        opportunités ou simplement échanger sur nos domaines d'intérêt communs.
                    </p>
                    <div style={{marginTop: '2rem'}}>
                        <Link to="/contact" className="btn-secondary" style={{ borderColor: 'white', color: 'white', marginTop:'2rem' }}>
                            Me contacter
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}

export default Home;