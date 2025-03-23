import { useState } from 'react';
import ProjectCard from '../components/ProjectCard';

function Projects() {
    // Catégories de filtrage
    const categories = ['Tous', 'Finance', 'Informatique', 'Recherche'];
    const [activeCategory, setActiveCategory] = useState('Tous');

    // Projets
    const projects = [
        {
            title: "Pricing d'Option Européenne par Méthodes Quantiques",
            description: "Implémentation d'un algorithme quantique pour le pricing d'options européennes Call, utilisant l'estimation d'amplitude quantique pour accélérer les simulations Monte Carlo.",
            tags: ["Finance Quantitative", "Informatique Quantique", "Python", "Qiskit"],
            link: "/projects/quantum-option",
            category: "Finance",
            github: "https://github.com/Hamidou1089-1/Quantum-Finance/tree/main"
        },
        {
            title: "Compilateur Java avec Optimisation de Code",
            description: "Conception d'un compilateur pour un sous-ensemble de Java (Deca) avec une implémentation d'optimiseur de code bas niveau.",
            tags: ["Compilation", "Java", "Optimisation de code"],
            link: "/projects/java-compiler",
            category: "Informatique"
        },
        {
            title: "Pricer d'Obligations (Java)",
            description: "Développement d'un outil de pricing d'obligations avec implémentation de la méthode Bootstrap.",
            tags: ["Finance", "Java", "Méthode Bootstrap"],
            link: "/projects/bond-pricer",
            category: "Finance"
        },
        {
            title: "Pricer d'Option C++",
            description: "Un pricer d'Option C++, afin de profiter des avantages du langage. Ce pricer est designer afin de pouvoir pricer plusieurs type d'instruments financiers. ",
            tags: ["Finance Quantitative", "C++", "Option", "Controle stochastique", "Simulation"],
            link: "/projects/option-pricer",
            category: "Finance",
            github: "https://github.com/Hamidou1089-1/Quantum-Finance/tree/main"
        },
        {
            title: "Dynamique stochastique des réseaux",
            description: "Un pricer d'Option C++, afin de profiter des avantages du langage. Ce pricer est designer afin de pouvoir pricer plusieurs type d'instruments financiers. ",
            tags: ["Finance Quantitative", "C++", "Option", "Controle stochastique", "Simulation"],
            link: "/projects/network-dynamics",
            category: "Recherche",
            github: "https://github.com/Hamidou1089-1/Quantum-Finance/tree/main"
        }

    ];

    // Filtrer les projets par catégorie
    const filteredProjects = activeCategory === 'Tous'
        ? projects
        : projects.filter(project => project.category === activeCategory);

    return (
        <section className="section" style={{ paddingTop: '120px' }}>
            <div className="container">
                <h1 className="section-title">Mes Projets</h1>

                {/* Filtres */}
                <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {categories.map(category => (
                        <button
                            key={category}
                            className={activeCategory === category ? 'btn-primary' : 'btn-secondary'}
                            onClick={() => setActiveCategory(category)}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Grille de projets */}
                <div className="projects-grid">
                    {filteredProjects.map((project, index) => (
                        <ProjectCard key={index} project={project} />
                    ))}
                </div>

                {/* Message si aucun projet */}
                {filteredProjects.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <p>Aucun projet dans cette catégorie pour le moment.</p>
                    </div>
                )}
            </div>
        </section>
    );
}

export default Projects;