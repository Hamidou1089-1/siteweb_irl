import { Link } from 'react-router-dom';

function ProjectCard({ project }) {
    return (
        <div className="project-card">
            {project.image && (
                <img
                    src={project.image}
                    alt={project.title}
                    className="project-image"
                />
            )}

            <div className="project-content">
                <h3 className="project-title">{project.title}</h3>
                <p className="project-description">{project.description}</p>

                {project.tags && (
                    <div className="project-tags">
                        {project.tags.map((tag, index) => (
                            <span key={index} className="project-tag">
                {tag}
              </span>
                        ))}
                    </div>
                )}

                <div className="project-buttons" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    {project.link && (
                        <Link to={project.link} className="btn-primary">
                            Voir le projet
                        </Link>
                    )}

                    {project.github && (
                        <a href={project.github} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                            <i className="fab fa-github" style={{ marginRight: '0.5rem' }}></i>GitHub
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProjectCard;