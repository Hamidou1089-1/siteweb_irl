import { Link } from 'react-router-dom';
import profileImage from '../assets/profile.png';


function About() {
    // Compétences
    const skills = {
        languages: ["C/C++", "Java", "Python", "SQL"],
        tools: ["Git", "Linux", "MATLAB", "LaTeX"],
        concepts: ["Algorithmes", "Structures de données", "Optimisation de code"],
        finance: ["Pricing d'obligations", "Méthode Bootstrap", "Calcul stochastique"]
    };

    // Parcours
    const education = [
        {
            degree: "Diplôme d'Ingénieur — Ingénierie Financière",
            institution: "Grenoble INP-ENSIMAG",
            period: "2024 - 2026",
            details: "Cours principaux : Marchés financiers, Méthodes numériques, Optimisation de code, Calcul stochastique"
        },
        {
            degree: "Licence en Mathématiques",
            institution: "Sorbonne Université",
            period: "2022 - 2024",
            details: "Avec mention Bien — Théorie de la mesure, Topologie, Calcul différentiel, Analyse complexe, Analyse numérique, Probabilités, Algèbre linéaire"
        }
    ];

    const experience = [
        {
            position: "Stagiaire de recherche — Dynamique stochastique des réseaux",
            company: "INRIA - Équipe Polaris",
            period: "Février 2025 - Juillet 2025",
            details: [
                "Étude des phénomènes de contagion dans les réseaux financiers interbancaires",
                "Analyse de la résistance des réseaux à un choc extérieur",
                "Détermination des seuils de robustesse et des propriétés structurelles des réseaux",
                "Modélisation mathématique et simulations en Python sous la supervision de Nicolas Gast, Frederica Garin et Paolo Fresca"
            ]
        }
    ];

    // Certificats et Hackathons
    const certifications = [
        "IBM: Bases de l'information quantique (2025)",
        "HackerRank Gold (Java) (2024)",
        "Coursera: Trading algorithmique et Finance (2024)"
    ];

    const hackathons = [
        {
            name: "Morgan Stanley — Trading algorithmique",
            date: "Novembre 2024",
            details: [
                "Développement de stratégies de tenue de marché",
                "Analyse de données de marché avec Python/Pandas"
            ]
        },
        {
            name: "Margo — Challenge de pricing d'obligations",
            date: "Janvier 2025",
            details: [
                "Construction de courbe de taux avec la méthode bootstrap",
                "Visualisation des résultats avec Matplotlib",
                "Prix: Coup de coeur du jury"
            ]
        }
    ];

    return (
        <>
            <section className="section" style={{ paddingTop: '120px' }}>
                <div className="container">
                    <h1 className="section-title">À Propos de Moi</h1>

                    <div className="about-grid">
                        <div>
                            <p style={{ marginBottom: '1.5rem' }}>
                                Je suis Hamidou Diallo, étudiant en deuxième année à Grenoble INP-ENSIMAG,
                                spécialisé en Ingénierie Financière. Je suis passionné par l'application
                                des mathématiques et de l'informatique dans le domaine de la finance.
                            </p>
                            <p style={{ marginBottom: '1.5rem' }}>
                                Mon parcours académique m'a permis de développer de solides compétences
                                en mathématiques, en informatique et en finance, que je mets en pratique
                                dans mes projets et stages.
                            </p>
                            <p>
                                Je suis actuellement stagiaire à l'INRIA dans l'équipe Polaris, où je
                                travaille sur la modélisation mathématique de réseaux complexes sous la
                                supervision de Nicolas Gast, Frederica Garin et Paolo Fresca.
                            </p>

                            <div style={{ marginTop: '2rem' }}>
                                <a
                                    href="/src/assets/cv_mise_a_jour_2025_fevrier.pdf"
                                    target="_blank"
                                    className="btn-primary"
                                    rel="noopener noreferrer"
                                >
                                    Télécharger mon CV
                                </a>
                            </div>
                        </div>
                        <div className="about-image">
                            <img
                                src={profileImage}
                                alt="Hamidou Diallo"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Skills Section */}
            <section className="section" style={{ background: 'var(--color-background)' }}>
                <div className="container">
                    <h2 className="section-title">Compétences</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
                        <div>
                            <h3>Langages</h3>
                            <ul>
                                {skills.languages.map((skill, index) => (
                                    <li key={index}>{skill}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3>Outils</h3>
                            <ul>
                                {skills.tools.map((tool, index) => (
                                    <li key={index}>{tool}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3>Concepts</h3>
                            <ul>
                                {skills.concepts.map((concept, index) => (
                                    <li key={index}>{concept}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3>Finance</h3>
                            <ul>
                                {skills.finance.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Education & Experience */}
            <section className="section">
                <div className="container">
                    <h2 className="section-title">Formation & Expérience</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <h3>Formation</h3>
                            {education.map((edu, index) => (
                                <div key={index} style={{ marginBottom: '2rem' }}>
                                    <h4>{edu.degree}</h4>
                                    <p style={{ color: 'var(--color-primary)', fontWeight: '500' }}>
                                        {edu.institution}
                                    </p>
                                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                                        {edu.period}
                                    </p>
                                    <p>{edu.details}</p>
                                </div>
                            ))}
                        </div>

                        <div>
                            <h3>Expérience Professionnelle</h3>
                            {experience.map((exp, index) => (
                                <div key={index} style={{ marginBottom: '2rem' }}>
                                    <h4>{exp.position}</h4>
                                    <p style={{ color: 'var(--color-primary)', fontWeight: '500' }}>
                                        {exp.company}
                                    </p>
                                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                                        {exp.period}
                                    </p>
                                    <ul>
                                        {exp.details.map((detail, detailIndex) => (
                                            <li key={detailIndex}>{detail}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Certifications & Hackathons */}
            <section className="section" style={{ background: 'var(--color-background)' }}>
                <div className="container">
                    <h2 className="section-title">Certifications & Hackathons</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <h3>Certifications</h3>
                            <ul>
                                {certifications.map((cert, index) => (
                                    <li key={index}>{cert}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3>Hackathons</h3>
                            {hackathons.map((hackathon, index) => (
                                <div key={index} style={{ marginBottom: '1.5rem' }}>
                                    <h4>{hackathon.name}</h4>
                                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                                        {hackathon.date}
                                    </p>
                                    <ul>
                                        {hackathon.details.map((detail, detailIndex) => (
                                            <li key={detailIndex}>{detail}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact CTA */}
            <section className="section gradient-bg" style={{ color: 'white' }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <h2>Intéressé par mon profil ?</h2>
                    <p style={{ marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                        N'hésitez pas à me contacter pour discuter de collaborations,
                        opportunités ou simplement échanger sur nos domaines d'intérêt communs.
                    </p>
                    <Link to="/contact" className="btn-secondary" style={{ borderColor: 'white', color: 'white' }}>
                        Me contacter
                    </Link>
                </div>
            </section>
        </>
    );
}

export default About;