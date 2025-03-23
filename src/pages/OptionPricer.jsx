import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Enregistrer les composants ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Options disponibles
const OPTION_TYPES = [
    {
        id: 'european-call',
        name: 'Call Européen',
        description: 'Droit d\'acheter l\'actif sous-jacent à un prix fixé à la date d\'échéance.',
        formula: 'C = S₀N(d₁) - Ke^(-rT)N(d₂)',
        parameters: ['S₀', 'K', 'r', 'σ', 'T'],
        use_cases: 'Protection contre la hausse des prix ou spéculation sur une tendance haussière.'
    },
    {
        id: 'european-put',
        name: 'Put Européen',
        description: 'Droit de vendre l\'actif sous-jacent à un prix fixé à la date d\'échéance.',
        formula: 'P = Ke^(-rT)N(-d₂) - S₀N(-d₁)',
        parameters: ['S₀', 'K', 'r', 'σ', 'T'],
        use_cases: 'Protection d\'un portefeuille contre les baisses ou spéculation sur une tendance baissière.'
    },
    // Autres types d'options à ajouter ultérieurement
    {
        id: 'american-call',
        name: 'Call Américain',
        description: 'Droit d\'acheter l\'actif sous-jacent à un prix fixé à n\'importe quel moment jusqu\'à la date d\'échéance.',
        formula: 'Nécessite méthodes numériques (pas de formule fermée)',
        parameters: ['S₀', 'K', 'r', 'σ', 'T'],
        use_cases: 'Plus flexible que l\'option européenne, permet d\'exercer quand les conditions sont optimales.'
    },
    {
        id: 'american-put',
        name: 'Put Américain',
        description: 'Droit de vendre l\'actif sous-jacent à un prix fixé à n\'importe quel moment jusqu\'à la date d\'échéance.',
        formula: 'Nécessite méthodes numériques (pas de formule fermée)',
        parameters: ['S₀', 'K', 'r', 'σ', 'T'],
        use_cases: 'Protection flexible d\'un portefeuille, permet d\'exercer au moment le plus opportun.'
    },
    {
        id: 'barrier-call',
        name: 'Option à Barrière',
        description: 'Option dont l\'activation ou la désactivation dépend du franchissement d\'un niveau de prix prédéfini.',
        formula: 'Varie selon le type de barrière (knock-in/knock-out)',
        parameters: ['S₀', 'K', 'r', 'σ', 'T', 'Barrière', 'Type de barrière'],
        use_cases: 'Réduction du coût des options classiques quand on a une forte conviction sur un niveau de prix.'
    }
];

// Service mock pour le calcul d'option (à remplacer par WebAssembly plus tard)
const calculateOptionPrice = async (type, params) => {
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 800));

    // Calcul du Call Européen avec Black-Scholes (implémentation simplifiée)
    if (type === 'european-call') {
        const { S0, K, r, sigma, T } = params;
        const d1 = (Math.log(S0 / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);

        const N = (x) => {
            // Approximation de la fonction de répartition de la loi normale
            const a1 = 0.254829592;
            const a2 = -0.284496736;
            const a3 = 1.421413741;
            const a4 = -1.453152027;
            const a5 = 1.061405429;
            const p = 0.3275911;

            const sign = (x < 0) ? -1 : 1;
            const z = Math.abs(x) / Math.sqrt(2);
            const t = 1.0 / (1.0 + p * z);
            const erf = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z));

            return 0.5 * (1.0 + sign * erf);
        };

        const price = S0 * N(d1) - K * Math.exp(-r * T) * N(d2);

        // Calcul des Greeks
        const delta = N(d1);
        const gamma = Math.exp(-d1 * d1 / 2) / (S0 * sigma * Math.sqrt(2 * Math.PI * T));
        const theta = -S0 * sigma * Math.exp(-d1 * d1 / 2) / (2 * Math.sqrt(T) * Math.sqrt(2 * Math.PI))
            - r * K * Math.exp(-r * T) * N(d2);
        const vega = S0 * Math.sqrt(T) * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
        const rho = K * T * Math.exp(-r * T) * N(d2);

        // Générer données pour graphique de payoff
        const payoffPoints = [];
        const pricePoints = [];
        const stockPrices = [];
        const minPrice = K * 0.5;
        const maxPrice = K * 1.5;
        const step = (maxPrice - minPrice) / 40;

        for (let price = minPrice; price <= maxPrice; price += step) {
            // Payoff à maturité
            const payoff = Math.max(0, price - K);
            payoffPoints.push(payoff);

            // Prix de l'option à t=0 pour différents prix du sous-jacent
            const d1New = (Math.log(price / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
            const d2New = d1New - sigma * Math.sqrt(T);
            const optionPrice = price * N(d1New) - K * Math.exp(-r * T) * N(d2New);

            pricePoints.push(optionPrice);
            stockPrices.push(price.toFixed(1));
        }

        return {
            price: price.toFixed(4),
            impliedVolatility: sigma, // Dans une implémentation réelle, calculer l'IV si nécessaire
            greeks: {
                delta: delta.toFixed(4),
                gamma: gamma.toFixed(4),
                theta: theta.toFixed(4),
                vega: vega.toFixed(4),
                rho: rho.toFixed(4)
            },
            charts: {
                payoff: {
                    labels: stockPrices,
                    datasets: [
                        {
                            label: 'Payoff à maturité',
                            data: payoffPoints,
                            borderColor: 'rgba(108, 99, 255, 1)',
                            backgroundColor: 'rgba(108, 99, 255, 0.2)',
                        },
                        {
                            label: 'Prix de l\'option',
                            data: pricePoints,
                            borderColor: 'rgba(200, 80, 192, 1)',
                            backgroundColor: 'rgba(200, 80, 192, 0.2)'
                        }
                    ]
                }
            }
        };
    }

    // Implémentation simplifiée pour les Puts européens
    if (type === 'european-put') {
        const { S0, K, r, sigma, T } = params;
        const d1 = (Math.log(S0 / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);

        const N = (x) => {
            // Même implémentation de la fonction N que pour le call
            const a1 = 0.254829592;
            const a2 = -0.284496736;
            const a3 = 1.421413741;
            const a4 = -1.453152027;
            const a5 = 1.061405429;
            const p = 0.3275911;

            const sign = (x < 0) ? -1 : 1;
            const z = Math.abs(x) / Math.sqrt(2);
            const t = 1.0 / (1.0 + p * z);
            const erf = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z));

            return 0.5 * (1.0 + sign * erf);
        };

        // Formule du put
        const price = K * Math.exp(-r * T) * N(-d2) - S0 * N(-d1);

        // Calcul des Greeks pour le put
        const delta = N(d1) - 1;
        const gamma = Math.exp(-d1 * d1 / 2) / (S0 * sigma * Math.sqrt(2 * Math.PI * T));
        const theta = -S0 * sigma * Math.exp(-d1 * d1 / 2) / (2 * Math.sqrt(T) * Math.sqrt(2 * Math.PI))
            + r * K * Math.exp(-r * T) * N(-d2);
        const vega = S0 * Math.sqrt(T) * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
        const rho = -K * T * Math.exp(-r * T) * N(-d2);

        // Générer données pour graphique de payoff du put
        const payoffPoints = [];
        const pricePoints = [];
        const stockPrices = [];
        const minPrice = K * 0.5;
        const maxPrice = K * 1.5;
        const step = (maxPrice - minPrice) / 40;

        for (let price = minPrice; price <= maxPrice; price += step) {
            // Payoff put à maturité
            const payoff = Math.max(0, K - price);
            payoffPoints.push(payoff);

            // Prix du put à t=0 pour différents prix du sous-jacent
            const d1New = (Math.log(price / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
            const d2New = d1New - sigma * Math.sqrt(T);
            const optionPrice = K * Math.exp(-r * T) * N(-d2New) - price * N(-d1New);

            pricePoints.push(optionPrice);
            stockPrices.push(price.toFixed(1));
        }

        return {
            price: price.toFixed(4),
            impliedVolatility: sigma,
            greeks: {
                delta: delta.toFixed(4),
                gamma: gamma.toFixed(4),
                theta: theta.toFixed(4),
                vega: vega.toFixed(4),
                rho: rho.toFixed(4)
            },
            charts: {
                payoff: {
                    labels: stockPrices,
                    datasets: [
                        {
                            label: 'Payoff à maturité',
                            data: payoffPoints,
                            borderColor: 'rgba(108, 99, 255, 1)',
                            backgroundColor: 'rgba(108, 99, 255, 0.2)',
                        },
                        {
                            label: 'Prix de l\'option',
                            data: pricePoints,
                            borderColor: 'rgba(200, 80, 192, 1)',
                            backgroundColor: 'rgba(200, 80, 192, 0.2)'
                        }
                    ]
                }
            }
        };
    }

    // Pour les autres types d'options, retourner un message indiquant que c'est en développement
    return {
        price: "En développement",
        message: "Le pricing de ce type d'option sera disponible prochainement."
    };
};

function OptionPricer() {
    const [activeView, setActiveView] = useState('introduction'); // 'introduction', 'selection', 'calculator'
    const [selectedOptionType, setSelectedOptionType] = useState(null);
    const [parameters, setParameters] = useState({
        S0: 100,
        K: 100,
        r: 0.05,
        sigma: 0.2,
        T: 1,
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('price'); // 'price', 'chart', 'explanation'

    // Réinitialiser les résultats lorsqu'un paramètre change
    useEffect(() => {
        setResult(null);
    }, [parameters, selectedOptionType]);

    const handleTypeSelection = (optionType) => {
        setSelectedOptionType(optionType);
        setActiveView('calculator');
        setResult(null);
        setActiveTab('price');
    };

    const handleParameterChange = (e) => {
        const { name, value } = e.target;
        setParameters(prev => ({
            ...prev,
            [name]: parseFloat(value)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const calculationResult = await calculateOptionPrice(selectedOptionType.id, parameters);
            setResult(calculationResult);
            setActiveTab('price'); // Afficher l'onglet des résultats après le calcul
        } catch (error) {
            console.error("Erreur de calcul:", error);
            // Gérer l'erreur (afficher un message à l'utilisateur)
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (activeView === 'calculator') {
            setActiveView('selection');
        } else if (activeView === 'selection') {
            setActiveView('introduction');
        }
    };

    // Options du graphique
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${parseFloat(context.raw).toFixed(2)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Prix du sous-jacent'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Valeur'
                }
            }
        }
    };

    return (
        <section className="section" style={{ paddingTop: '120px', minHeight: '100vh' }}>
            <div className="container">
                {/* Menu supérieur de navigation */}
                <div className="option-pricer-navigation" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {activeView !== 'introduction' && (
                            <button
                                onClick={handleBack}
                                className="btn-secondary"
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                ← Retour
                            </button>
                        )}
                        <h1 className="section-title" style={{ margin: 0 }}>
                            Calculateur d'Options Financières
                        </h1>
                    </div>

                    {/* Fil d'Ariane */}
                    <div className="breadcrumb" style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0', alignItems: 'center' }}>
            <span
                onClick={() => setActiveView('introduction')}
                style={{
                    cursor: 'pointer',
                    color: activeView === 'introduction' ? 'var(--color-primary)' : 'var(--color-text-light)',
                    fontWeight: activeView === 'introduction' ? '600' : '400'
                }}
            >
              Introduction
            </span>

                        {(activeView === 'selection' || activeView === 'calculator') && (
                            <>
                                <span style={{ color: 'var(--color-text-light)' }}>→</span>
                                <span
                                    onClick={() => setActiveView('selection')}
                                    style={{
                                        cursor: 'pointer',
                                        color: activeView === 'selection' ? 'var(--color-primary)' : 'var(--color-text-light)',
                                        fontWeight: activeView === 'selection' ? '600' : '400'
                                    }}
                                >
                  Sélection du type d'option
                </span>
                            </>
                        )}

                        {activeView === 'calculator' && selectedOptionType && (
                            <>
                                <span style={{ color: 'var(--color-text-light)' }}>→</span>
                                <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
                  {selectedOptionType.name}
                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Contenu principal qui change selon la vue active */}
                <div className="option-pricer-content">
                    {/* Vue d'introduction */}
                    {activeView === 'introduction' && (
                        <div className="introduction-view">
                            <div className="info-card" style={{
                                background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(200, 80, 192, 0.1) 100%)',
                                padding: '2rem',
                                borderRadius: '12px',
                                marginBottom: '2rem'
                            }}>
                                <h2>Les options financières expliquées</h2>
                                <p>
                                    Les options financières sont des contrats qui donnent le droit, mais non l'obligation,
                                    d'acheter ou de vendre un actif sous-jacent à un prix prédéterminé avant ou à une date d'échéance spécifique.
                                </p>
                                <p>
                                    Utilisées à la fois comme instruments de couverture et de spéculation, les options permettent
                                    de se protéger contre les fluctuations de prix ou de profiter des mouvements du marché avec
                                    un capital initial limité.
                                </p>

                                <div style={{ margin: '2rem 0' }}>
                                    <h3>Concepts fondamentaux</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
                                        <div className="concept-card" style={{
                                            background: 'var(--color-background)',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 8px var(--color-border)'
                                        }}>
                                            <h4>Call vs Put</h4>
                                            <p><strong>Call</strong> : Droit d'acheter l'actif sous-jacent</p>
                                            <p><strong>Put</strong> : Droit de vendre l'actif sous-jacent</p>
                                        </div>

                                        <div className="concept-card" style={{
                                            background: 'var(--color-background)',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 8px var(--color-border)'
                                        }}>
                                            <h4>Européenne vs Américaine</h4>
                                            <p><strong>Européenne</strong> : Exercice uniquement à maturité</p>
                                            <p><strong>Américaine</strong> : Exercice possible à tout moment</p>
                                        </div>

                                        <div className="concept-card" style={{
                                            background: 'var(--color-background)',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 8px var(--color-border)'
                                        }}>
                                            <h4>Terminologie essentielle</h4>
                                            <p><strong>Strike (K)</strong> : Prix d'exercice de l'option</p>
                                            <p><strong>Maturité (T)</strong> : Date d'expiration du contrat</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveView('selection')}
                                    className="btn-primary"
                                    style={{ marginTop: '1rem' }}
                                >
                                    Explorer les types d'options
                                </button>
                            </div>

                            <div className="pricing-theory" style={{ marginTop: '3rem' }}>
                                <h2>Le pricing d'options</h2>
                                <p>
                                    La valorisation des options repose sur plusieurs méthodes, de la formule fermée de Black-Scholes
                                    pour les options européennes aux méthodes numériques plus complexes pour les structures exotiques.
                                </p>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(200, 80, 192, 0.1) 100%)',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px var(--color-border)',
                                    margin: '1.5rem 0'
                                }}>
                                    <h3>Les "Greeks" - Mesures de sensibilité</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <h4 className="gradient-text">Delta (Δ)</h4>
                                            <p>Sensibilité du prix de l'option par rapport au prix du sous-jacent</p>
                                        </div>
                                        <div>
                                            <h4 className="gradient-text">Gamma (Γ)</h4>
                                            <p>Taux de variation du delta par rapport au prix du sous-jacent</p>
                                        </div>
                                        <div>
                                            <h4 className="gradient-text">Theta (Θ)</h4>
                                            <p>Sensibilité du prix de l'option par rapport au temps</p>
                                        </div>
                                        <div>
                                            <h4 className="gradient-text">Vega (ν)</h4>
                                            <p>Sensibilité du prix de l'option par rapport à la volatilité</p>
                                        </div>
                                        <div>
                                            <h4 className="gradient-text">Rho (ρ)</h4>
                                            <p>Sensibilité du prix de l'option par rapport au taux d'intérêt</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveView('selection')}
                                    className="btn-primary"
                                >
                                    Calculer le prix d'une option
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Vue de sélection du type d'option */}
                    {activeView === 'selection' && (
                        <div className="selection-view">
                            <h2>Sélectionnez un type d'option</h2>
                            <p>
                                Choisissez le type d'option que vous souhaitez calculer parmi les options disponibles ci-dessous.
                                Chaque option possède des caractéristiques uniques et des cas d'utilisation spécifiques.
                            </p>

                            <div className="options-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '1.5rem',
                                margin: '2rem 0'
                            }}>
                                {OPTION_TYPES.map((option) => (
                                    <div
                                        key={option.id}
                                        className="option-card"
                                        style={{
                                            background: 'var(--color-background)',
                                            borderRadius: '12px',
                                            padding: '1.5rem',
                                            boxShadow: '0 4px 12px var(--color-border)',
                                            transition: 'transform 0.3s, box-shadow 0.3s',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => handleTypeSelection(option)}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-5px)';
                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(108, 99, 255, 0.15)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                        }}
                                    >
                                        <h3 className="gradient-text">{option.name}</h3>
                                        <p>{option.description}</p>

                                        <div style={{ margin: '1rem 0' }}>
                                            <strong>Formule :</strong>
                                            <div style={{
                                                background: 'rgba(108, 99, 255, 0.05)',
                                                padding: '0.75rem',
                                                borderRadius: '6px',
                                                fontFamily: 'monospace',
                                                margin: '0.5rem 0'
                                            }}>
                                                {option.formula}
                                            </div>
                                        </div>

                                        <div>
                                            <strong>Cas d'utilisation :</strong>
                                            <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>{option.use_cases}</p>
                                        </div>

                                        <button
                                            className="btn-primary"
                                            style={{ width: '100%', marginTop: '1rem' }}
                                        >
                                            Sélectionner
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Vue calculateur avec l'option sélectionnée */}
                    {activeView === 'calculator' && selectedOptionType && (
                        <div className="calculator-view">
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '2rem',
                                marginBottom: '2rem'
                            }}>
                                {/* Colonne de gauche: formulaire */}
                                <div>
                                    <div className="option-info" style={{
                                        background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(200, 80, 192, 0.1) 100%)',
                                        borderRadius: '12px',
                                        padding: '1.5rem',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                        marginBottom: '1.5rem'
                                    }}>
                                        <h2 className="gradient-text">{selectedOptionType.name}</h2>
                                        <p>{selectedOptionType.description}</p>

                                        <div style={{ margin: '1rem 0' }}>
                                            <strong>Formule :</strong>
                                            <div style={{
                                                background: 'rgba(108, 99, 255, 0.05)',
                                                padding: '0.75rem',
                                                borderRadius: '6px',
                                                fontFamily: 'monospace',
                                                margin: '0.5rem 0'
                                            }}>
                                                {selectedOptionType.formula}
                                            </div>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="calculator-form" style={{
                                        background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(200, 80, 192, 0.1) 100%)',
                                        borderRadius: '12px',
                                        padding: '1.5rem',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }}>
                                        <h3>Paramètres de l'option</h3>

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Prix du sous-jacent (S₀)
                                            </label>
                                            <input
                                                type="number"
                                                name="S0"
                                                value={parameters.S0}
                                                onChange={handleParameterChange}
                                                step="0.01"
                                                min="0.01"
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '0.6rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--color-border)'
                                                }}
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Prix d'exercice (K)
                                            </label>
                                            <input
                                                type="number"
                                                name="K"
                                                value={parameters.K}
                                                onChange={handleParameterChange}
                                                step="0.01"
                                                min="0.01"
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '0.6rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--color-border)'
                                                }}
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Taux sans risque (r)
                                            </label>
                                            <input
                                                type="number"
                                                name="r"
                                                value={parameters.r}
                                                onChange={handleParameterChange}
                                                step="0.001"
                                                min="0"
                                                max="1"
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '0.6rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--color-border)'
                                                }}
                                            />
                                            <small style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                                                Exemple: 0.05 pour 5%
                                            </small>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Volatilité (σ)
                                            </label>
                                            <input
                                                type="number"
                                                name="sigma"
                                                value={parameters.sigma}
                                                onChange={handleParameterChange}
                                                step="0.01"
                                                min="0.01"
                                                max="2"
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '0.6rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--color-border)'
                                                }}
                                            />
                                            <small style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                                                Exemple: 0.2 pour 20%
                                            </small>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Temps jusqu'à maturité (T)
                                            </label>
                                            <input
                                                type="number"
                                                name="T"
                                                value={parameters.T}
                                                onChange={handleParameterChange}
                                                step="0.01"
                                                min="0.01"
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '0.6rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--color-border)'
                                                }}
                                            />
                                            <small style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                                                En années. Exemple: 0.5 pour 6 mois
                                            </small>
                                        </div>

                                        <button
                                            type="submit"
                                            className="btn-primary"
                                            style={{ width: '100%' }}
                                            disabled={loading}
                                        >
                                            {loading ? 'Calcul en cours...' : 'Calculer le prix'}
                                        </button>
                                    </form>
                                </div>

                                {/* Colonne de droite: résultats */}
                                <div>
                                    {/* Onglets de résultats */}
                                    {result ? (
                                        <div className="results-container" style={{
                                            background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(200, 80, 192, 0.1) 100%)',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                            overflow: 'hidden'
                                        }}>
                                            <div className="result-tabs" style={{
                                                display: 'flex',
                                                borderBottom: '1px solid var(--color-border)'
                                            }}>
                                                <div
                                                    className={`tab ${activeTab === 'price' ? 'active' : ''}`}
                                                    onClick={() => setActiveTab('price')}
                                                    style={{
                                                        padding: '1rem',
                                                        flex: 1,
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        borderBottom: activeTab === 'price' ? '2px solid var(--color-primary)' : 'none',
                                                        fontWeight: activeTab === 'price' ? '600' : '400',
                                                        color: activeTab === 'price' ? 'var(--color-primary)' : 'var(--color-text)'
                                                    }}
                                                >
                                                    Prix & Greeks
                                                </div>

                                                <div
                                                    className={`tab ${activeTab === 'chart' ? 'active' : ''}`}
                                                    onClick={() => setActiveTab('chart')}
                                                    style={{
                                                        padding: '1rem',
                                                        flex: 1,
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        borderBottom: activeTab === 'chart' ? '2px solid var(--color-primary)' : 'none',
                                                        fontWeight: activeTab === 'chart' ? '600' : '400',
                                                        color: activeTab === 'chart' ? 'var(--color-primary)' : 'var(--color-text)'
                                                    }}
                                                >
                                                    Graphiques
                                                </div>

                                                <div
                                                    className={`tab ${activeTab === 'explanation' ? 'active' : ''}`}
                                                    onClick={() => setActiveTab('explanation')}
                                                    style={{
                                                        padding: '1rem',
                                                        flex: 1,
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        borderBottom: activeTab === 'explanation' ? '2px solid var(--color-primary)' : 'none',
                                                        fontWeight: activeTab === 'explanation' ? '600' : '400',
                                                        color: activeTab === 'explanation' ? 'var(--color-primary)' : 'var(--color-text)'
                                                    }}
                                                >
                                                    Explication
                                                </div>
                                            </div>

                                            <div className="tab-content" style={{ padding: '1.5rem' }}>
                                                {/* Onglet Prix et Greeks */}
                                                {activeTab === 'price' && (
                                                    <div className="price-tab">
                                                        <div className="price-result" style={{
                                                            textAlign: 'center',
                                                            marginBottom: '2rem'
                                                        }}>
                                                            <h3>Prix de l'option</h3>
                                                            <div style={{
                                                                fontSize: '2.5rem',
                                                                fontWeight: 'bold',
                                                                color: 'var(--color-primary)'
                                                            }}>
                                                                {result.price}
                                                            </div>
                                                        </div>

                                                        {result.greeks && (
                                                            <div className="greeks-result">
                                                                <h3>Greeks</h3>
                                                                <div style={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                                                    gap: '1rem',
                                                                    margin: '1rem 0'
                                                                }}>
                                                                    <div className="greek-card" style={{
                                                                        textAlign: 'center',
                                                                        padding: '1rem',
                                                                        background: 'rgba(108, 99, 255, 0.05)',
                                                                        borderRadius: '8px'
                                                                    }}>
                                                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Delta (Δ)</div>
                                                                        <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{result.greeks.delta}</div>
                                                                    </div>

                                                                    <div className="greek-card" style={{
                                                                        textAlign: 'center',
                                                                        padding: '1rem',
                                                                        background: 'rgba(108, 99, 255, 0.05)',
                                                                        borderRadius: '8px'
                                                                    }}>
                                                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Gamma (Γ)</div>
                                                                        <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{result.greeks.gamma}</div>
                                                                    </div>

                                                                    <div className="greek-card" style={{
                                                                        textAlign: 'center',
                                                                        padding: '1rem',
                                                                        background: 'rgba(108, 99, 255, 0.05)',
                                                                        borderRadius: '8px'
                                                                    }}>
                                                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Theta (Θ)</div>
                                                                        <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{result.greeks.theta}</div>
                                                                    </div>

                                                                    <div className="greek-card" style={{
                                                                        textAlign: 'center',
                                                                        padding: '1rem',
                                                                        background: 'rgba(108, 99, 255, 0.05)',
                                                                        borderRadius: '8px'
                                                                    }}>
                                                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Vega (ν)</div>
                                                                        <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{result.greeks.vega}</div>
                                                                    </div>

                                                                    <div className="greek-card" style={{
                                                                        textAlign: 'center',
                                                                        padding: '1rem',
                                                                        background: 'rgba(108, 99, 255, 0.05)',
                                                                        borderRadius: '8px'
                                                                    }}>
                                                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Rho (ρ)</div>
                                                                        <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{result.greeks.rho}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Message si l'option n'est pas encore implémentée */}
                                                        {result.message && (
                                                            <div style={{
                                                                background: 'rgba(108, 99, 255, 0.05)',
                                                                padding: '1rem',
                                                                borderRadius: '8px',
                                                                margin: '1rem 0'
                                                            }}>
                                                                <p>{result.message}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Onglet Graphiques */}
                                                {activeTab === 'chart' && result.charts && (
                                                    <div className="chart-tab">
                                                        <h3>Profil de Payoff et Prix</h3>
                                                        <p style={{ marginBottom: '1rem' }}>
                                                            Ce graphique montre le payoff à maturité (bleu) et le prix actuel de l'option (rose)
                                                            en fonction du prix du sous-jacent.
                                                        </p>

                                                        <div style={{ height: '400px' }}>
                                                            <Line
                                                                data={result.charts.payoff}
                                                                options={chartOptions}
                                                                style={{ maxHeight: '100%' }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Onglet Explication */}
                                                {activeTab === 'explanation' && (
                                                    <div className="explanation-tab">
                                                        <h3>Comprendre les résultats</h3>

                                                        <div style={{ margin: '1rem 0' }}>
                                                            <h4>Interprétation du prix</h4>
                                                            <p>
                                                                Le prix calculé représente la valeur actuelle théorique de l'option {selectedOptionType.name.toLowerCase()}
                                                                avec les paramètres spécifiés. Il prend en compte la valeur temps et la valeur intrinsèque de l'option.
                                                            </p>
                                                        </div>

                                                        {result.greeks && (
                                                            <div style={{ margin: '1.5rem 0' }}>
                                                                <h4>Interprétation des Greeks</h4>
                                                                <ul style={{ paddingLeft: '1.5rem' }}>
                                                                    <li style={{ marginBottom: '0.5rem' }}>
                                                                        <strong>Delta ({result.greeks.delta})</strong>: Représente la variation du prix de l'option
                                                                        pour une variation unitaire du prix du sous-jacent.
                                                                        {selectedOptionType.id === 'european-call'
                                                                            ? ' Pour un call, le delta est toujours entre 0 et 1.'
                                                                            : selectedOptionType.id === 'european-put'
                                                                                ? ' Pour un put, le delta est toujours entre -1 et 0.'
                                                                                : ''}
                                                                    </li>
                                                                    <li style={{ marginBottom: '0.5rem' }}>
                                                                        <strong>Gamma ({result.greeks.gamma})</strong>: Mesure le taux de variation du delta.
                                                                        Un gamma élevé signifie que le delta change rapidement avec les mouvements du sous-jacent.
                                                                    </li>
                                                                    <li style={{ marginBottom: '0.5rem' }}>
                                                                        <strong>Theta ({result.greeks.theta})</strong>: Représente la dépréciation de l'option
                                                                        due au passage du temps. Un theta négatif signifie que l'option perd de la valeur avec le temps.
                                                                    </li>
                                                                    <li style={{ marginBottom: '0.5rem' }}>
                                                                        <strong>Vega ({result.greeks.vega})</strong>: Mesure la sensibilité du prix de l'option
                                                                        à la volatilité. Un vega élevé signifie que l'option est très sensible aux changements de volatilité.
                                                                    </li>
                                                                    <li>
                                                                        <strong>Rho ({result.greeks.rho})</strong>: Mesure la sensibilité du prix de l'option
                                                                        aux variations de taux d'intérêt.
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        )}

                                                        <div style={{
                                                            background: 'rgba(108, 99, 255, 0.05)',
                                                            padding: '1rem',
                                                            borderRadius: '8px',
                                                            margin: '1.5rem 0'
                                                        }}>
                                                            <h4>Méthode de calcul</h4>
                                                            <p>
                                                                {selectedOptionType.id === 'european-call' || selectedOptionType.id === 'european-put'
                                                                    ? 'Le prix a été calculé en utilisant la formule analytique de Black-Scholes, qui suppose une distribution log-normale des prix du sous-jacent.'
                                                                    : 'Le prix a été calculé en utilisant des méthodes numériques adaptées à ce type d\'option.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="no-result" style={{
                                            background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(200, 80, 192, 0.1) 100%)',
                                            borderRadius: '12px',
                                            padding: '2rem',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                            textAlign: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '400px'
                                        }}>
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: '50%',
                                                background: 'var(--gradient-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginBottom: '1.5rem'
                                            }}>
                                                <div style={{
                                                    fontSize: '2rem',
                                                    fontWeight: 'bold',
                                                    color: 'white'
                                                }}>?</div>
                                            </div>
                                            <h3>Entrez les paramètres de l'option</h3>
                                            <p style={{ maxWidth: '400px', margin: '0.5rem auto' }}>
                                                Remplissez le formulaire à gauche et cliquez sur "Calculer le prix" pour obtenir la valeur de l'option et les Greeks.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Barre de navigation inférieure */}
                {activeView === 'introduction' && (
                    <div className="bottom-nav" style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'var(--color-background)',
                        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
                        zIndex: 10
                    }}>
                        <div className="container" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem 0'
                        }}>
                            <div>
                                <span style={{ fontWeight: '500' }}>Prêt à calculer ?</span>
                                <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-light)' }}>
                  Choisissez une option pour commencer
                </span>
                            </div>

                            <button
                                onClick={() => setActiveView('selection')}
                                className="btn-primary"
                            >
                                Explorer les options disponibles
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default OptionPricer;