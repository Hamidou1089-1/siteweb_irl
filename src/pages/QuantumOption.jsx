import { Link } from 'react-router-dom';

function QuantumOption() {
    return (
        <section className="section" style={{ paddingTop: '120px' }}>
            <div className="container">
                <Link to="/projects" className="btn-secondary" style={{ marginBottom: '2rem', display: 'inline-block' }}>
                    ← Retour aux projets
                </Link>

                <h1 className="section-title">Pricing d'Option Européenne par Méthodes Quantiques</h1>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div>
                        <h2>Description du projet</h2>
                        <p style={{ marginBottom: '1rem' }}>
                            Ce projet explore l'utilisation de l'informatique quantique pour le pricing
                            d'options financières européennes de type Call. L'approche utilise l'estimation d'amplitude
                            quantique (QAE) pour accélérer les simulations Monte Carlo nécessaires à l'évaluation
                            précise du prix des options.
                        </p>

                        <p style={{ marginBottom: '1rem' }}>
                            Les options européennes sont des contrats financiers qui donnent le droit, mais non
                            l'obligation, d'acheter ou de vendre un actif sous-jacent à un prix prédéterminé à une
                            date d'expiration spécifique. Le pricing de ces options est traditionnellement réalisé
                            à l'aide de formules analytiques comme Black-Scholes ou par des méthodes numériques
                            comme la simulation Monte Carlo.
                        </p>

                        <p style={{ marginBottom: '2rem' }}>
                            Dans ce projet, j'ai implémenté un algorithme quantique complet utilisant la bibliothèque
                            Qiskit d'IBM (version 1.4.1) pour accélérer les simulations Monte Carlo pour le pricing d'options.
                            L'algorithme exploite les propriétés de superposition quantique pour explorer simultanément
                            plusieurs trajectoires de prix, offrant un avantage quadratique par rapport
                            aux méthodes classiques (complexité en O(1/ε) contre O(1/ε²) pour les méthodes classiques,
                            où ε représente la précision souhaitée).
                        </p>

                        <h2>Méthodologie</h2>
                        <ol style={{ marginBottom: '2rem', paddingLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>Discrétisation et encodage</strong> - J'ai conçu une stratégie de discrétisation avancée
                                pour représenter efficacement la distribution log-normale des prix des actifs sur un ensemble fini
                                d'états quantiques, avec une attention particulière aux valeurs proches du prix d'exercice.
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>Construction de distribution de probabilité</strong> - Implémentation d'un circuit
                                quantique générant la distribution de probabilité des prix d'actifs à maturité en utilisant
                                des rotations conditionnelles récursives.
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>Fonction de payoff quantique</strong> - Création d'un encodage pour la fonction
                                de payoff avec des transformations affines pour normaliser le résultat dans l'intervalle [0,1].
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>Circuit comparateur</strong> - Développement d'un circuit quantique qui effectue
                                efficacement la comparaison du prix avec le prix d'exercice.
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>Estimation d'amplitude itérative</strong> - Application de l'algorithme d'estimation
                                d'amplitude itérative pour extraire la valeur de l'option avec une précision ciblée et
                                un niveau de confiance spécifié.
                            </li>
                        </ol>

                        <h2>Résultats clés</h2>
                        <ul style={{ marginBottom: '2rem', paddingLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>
                                Implémentation réussie d'un pricer quantique complet avec estimation d'amplitude itérative
                                sur simulateur AerSimulator de Qiskit.
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                Démonstration de l'avantage théorique en termes de complexité (O(1/ε) vs O(1/ε²) pour les méthodes classiques),
                                qui représente un potentiel d'accélération quadratique.
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                Analyse comparative détaillée des résultats avec la solution analytique de Black-Scholes et les
                                simulations Monte Carlo classiques, montrant une précision comparable avec moins d'itérations.
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                Optimisation des circuits pour minimiser la profondeur et le nombre de portes quantiques, réduisant
                                les exigences matérielles tout en maintenant la précision.
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                Étude des limites actuelles des dispositifs NISQ (Noisy Intermediate-Scale Quantum) et évaluation
                                de la viabilité future pour des applications financières pratiques.
                            </li>
                        </ul>

                        <h2>Technologies utilisées</h2>
                        <div className="project-tags" style={{ marginBottom: '2rem' }}>
                            <span className="project-tag">Python</span>
                            <span className="project-tag">Qiskit 1.4.1</span>
                            <span className="project-tag">Qiskit_Aer</span>
                            <span className="project-tag">NumPy</span>
                            <span className="project-tag">Matplotlib</span>
                            <span className="project-tag">SciPy</span>
                            <span className="project-tag">Finance Quantitative</span>
                            <span className="project-tag">Monte Carlo</span>
                            <span className="project-tag">Estimation d'Amplitude Quantique</span>
                        </div>

                        <h2>Aperçu du code</h2>
                        <pre style={{
                            backgroundColor: '#f5f5f5',
                            padding: '1rem',
                            borderRadius: '8px',
                            overflowX: 'auto',
                            marginBottom: '2rem'
                        }}>
{`# Extrait du code d'implémentation réelle
import numpy as np
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit.circuit.library import OrGate
from qiskit.circuit.library.standard_gates import RYGate
from qiskit_aer.primitives import SamplerV2
from qiskit_algorithms import IterativeAmplitudeEstimation, EstimationProblem
from scipy.stats import norm, lognorm

# Paramètres de l'option
sigma = 0.2  # volatilité (annualisée)
T = 1        # maturité (en années)
r = 0.05     # taux sans risque (annualisé)
S0 = 2       # prix initial de l'actif
K = 2        # prix d'exercice

# Dictionnaires de configuration
price_dict = {'S0': S0, 'r': r, 'sigma': sigma, 'T': T}
circ_dict = {'n': 7, 'd': 0.001, 'num_stddev': 10, 'm': 5}

# Fonction pour encoder une fonction affine dans un circuit quantique
def encode_affine_function(n, a, b):
    qc = QuantumCircuit(n+1)
    qc.ry(2*a, 0)
    for k in range(1, n+1):
        qc.cry(b*2**k, k, 0)
    return qc

# Création du circuit comparateur pour le prix d'exercice
def make_comparator(n, L):
    q = QuantumCircuit(2*n)
    or_circuit = or_gate()
    gate_or = or_circuit.to_gate(label='OR')
    l_to_binary = format(2**n - L, f'0{n}b')
    
    if l_to_binary[n - 1] == '1':
        q.cx(n, n-1)
        q.barrier()
    
    for j in range(1, n):
        if l_to_binary[n-1-j] == '1':
            q.append(gate_or, [n+j, n-j, n-j-1])
            q.barrier()
        else:
            q.ccx(n+j, n-j, n-j-1)
            q.barrier()
    
    return q

# Circuit principal intégrant tous les composants
def integration(circ_dict, price_dict, K):
    n = circ_dict['n']
    m = circ_dict['m']
    
    # Registres quantiques
    qr_auxiliaire = QuantumRegister(m, 'auxiliaire')
    qr_distribution = QuantumRegister(n, 'distribution')
    qr_comparateur = QuantumRegister(n, 'comparateur')
    qr_result = QuantumRegister(1, 'result')
    
    qc = QuantumCircuit(qr_auxiliaire, qr_result, qr_distribution, qr_comparateur)
    
    # 1. Circuit de distribution de probabilité
    dist_circuit = make_distribution_circuit(n, price_dict, circ_dict['num_stddev'])
    qc.compose(dist_circuit, range(m+1, m+n+1), inplace=True)
    qc.barrier()
    
    # 2. Circuit comparateur pour le strike price
    L = align_for_L(n, K, price_dict, circ_dict['m'])
    comp_circuit = make_comparator(n, L)
    qc.compose(comp_circuit, range(m+1, 2*n+1+m), inplace=True)
    qc.barrier()
    
    # 3. Encodage de la fonction affine pour le payoff
    f0_circuit, f1_circuit = circuit_afine_function(circ_dict, price_dict, K)
    qc.compose(f0_circuit, m, inplace=True)
    qc.barrier()
    
    # 4. Application conditionnelle de la fonction affine
    controled_f1 = f1_circuit.to_gate().control(1)
    qc.append(controled_f1, range(m+n+1, m-1, -1))
    qc.barrier()
    
    return qc

# Évaluation avec estimation d'amplitude itérative
def qae_eval(qc_pricer):
    obj_qubits = qc_pricer.find_bit(qc_pricer.qregs[1][0]).index
    problem = EstimationProblem(
        state_preparation=qc_pricer,
        objective_qubits=[obj_qubits]
    )
    
    iae = IterativeAmplitudeEstimation(
        epsilon_target=0.01,  # Précision cible
        alpha=0.05,           # Niveau de confiance
    )
    
    result = iae.estimate(problem).estimation
    return result`}
            </pre>

                        <h2>Conclusion</h2>
                        <p style={{ marginBottom: '1rem' }}>
                            Ce projet démontre l'avantage théorique significatif de l'informatique quantique dans le domaine
                            de la finance quantitative, particulièrement pour le pricing d'options. Nos tests montrent
                            qu'avec une précision ε = 0.01, les méthodes Monte Carlo classiques nécessitent environ
                            10 000 simulations (complexité en O(1/ε²)), tandis que notre approche quantique nécessite
                            théoriquement seulement 100 itérations (complexité en O(1/ε)), représentant un gain
                            potentiel de performance de 100×.
                        </p>

                        <p style={{ marginBottom: '1rem' }}>
                            Bien que les contraintes des ordinateurs quantiques actuels (NISQ) limitent
                            encore les applications pratiques en raison du bruit et de la profondeur de circuit requise,
                            cette approche ouvre la voie à des avancées significatives dans la finance computationnelle
                            à mesure que la technologie quantique progresse.
                        </p>

                        <p>
                            Les développements futurs pourraient inclure l'extension de cette méthode aux
                            options plus complexes (options asiatiques, lookback, etc.), l'application à d'autres
                            produits dérivés, ainsi que l'optimisation des circuits quantiques pour améliorer
                            la résistance au bruit sur les appareils quantiques réels.
                        </p>
                    </div>

                    <div>
                        <div style={{
                            background: 'white',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
                            position: 'sticky',
                            top: '100px'
                        }}>
                            <h3>Détails du projet</h3>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Date</h4>
                                <p>Mars 2025</p>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Catégorie</h4>
                                <p>Finance Quantitative, Informatique Quantique</p>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Technologies</h4>
                                <div className="project-tags" style={{ marginTop: '0.5rem' }}>
                                    <span className="project-tag">Python</span>
                                    <span className="project-tag">Qiskit</span>
                                    <span className="project-tag">Finance</span>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Ressources</h4>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <a href="https://github.com/Hamidou1089-1/Quantum-Finance/blob/main/PricerQuantique_rendu.ipynb" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'block', textAlign: 'center' }}>
                                            <i className="fab fa-github" style={{ marginRight: '0.5rem' }}></i>Code source
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://github.com/Hamidou1089-1/Quantum-Finance" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'block', textAlign: 'center' }}>
                                            Notebook Python
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default QuantumOption;