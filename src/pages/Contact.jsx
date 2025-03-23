import { useState } from 'react';

function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [formStatus, setFormStatus] = useState({
        submitted: false,
        success: false,
        message: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Simuler l'envoi du formulaire
        // Dans une application réelle, vous utiliseriez un service d'envoi d'e-mails

        // Simuler un succès
        setFormStatus({
            submitted: true,
            success: true,
            message: 'Votre message a été envoyé avec succès ! Je vous contacterai dès que possible.'
        });

        // Réinitialiser le formulaire
        setFormData({
            name: '',
            email: '',
            subject: '',
            message: ''
        });
    };

    return (
        <section className="section" style={{ paddingTop: '120px' }}>
            <div className="container">
                <h1 className="section-title">Contact</h1>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                        <h2>Restons en contact</h2>
                        <p style={{ marginBottom: '2rem' }}>
                            N'hésitez pas à me contacter pour discuter de collaborations, opportunités
                            ou simplement échanger sur nos domaines d'intérêt communs.
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.2rem' }}>Email</h3>
                            <p>
                                <a href="mailto:Hamidou.Diallo@grenoble-inp.org">
                                    Hamidou.Diallo@grenoble-inp.org
                                </a>
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.2rem' }}>Téléphone</h3>
                            <p>
                                <a href="tel:+33758618251">+33 (7) 58 61 82 51</a>
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.2rem' }}>LinkedIn</h3>
                            <p>
                                <a
                                    href="https://linkedin.com/in/hamidou-diallo-842969217"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    linkedin.com/in/hamidou-diallo-842969217
                                </a>
                            </p>
                        </div>

                        <div>
                            <h3 style={{ fontSize: '1.2rem' }}>Adresse</h3>
                            <p>ENSIMAG, Grenoble INP</p>
                        </div>
                    </div>

                    <div className="contact-form">
                        <h2>Envoyez-moi un message</h2>

                        {formStatus.submitted && formStatus.success ? (
                            <div
                                style={{
                                    padding: '1rem',
                                    backgroundColor: 'rgba(108, 99, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'var(--color-primary)',
                                    marginBottom: '1rem'
                                }}
                            >
                                {formStatus.message}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label htmlFor="name" className="form-label">Nom</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        className="form-control"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="email" className="form-label">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        className="form-control"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="subject" className="form-label">Sujet</label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        className="form-control"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="message" className="form-label">Message</label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        className="form-control"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                    ></textarea>
                                </div>

                                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                                    Envoyer
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Contact;