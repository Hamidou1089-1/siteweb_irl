import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import * as d3 from 'd3';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function NetworkDynamics() {
    // Ref for the network simulation SVG
    const networkRef = useRef(null);

    // State for simulation parameters
    const [simulationParams, setSimulationParams] = useState({
        nodes: 10,
        connections: 0.2,
        initialDefaultProbability: 0.1,
        shockMagnitude: 0.5
    });

    // State for simulation results
    const [simulationResults, setSimulationResults] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // State for network visualization
    const [network, setNetwork] = useState({
        nodes: [],
        links: []
    });

    // Handle parameter changes
    const handleParamChange = (e) => {
        const { name, value } = e.target;
        setSimulationParams(prev => ({
            ...prev,
            [name]: parseFloat(value)
        }));
    };

    // Run simulation
    const runSimulation = () => {
        setIsSimulating(true);

        // Simulate network generation
        setTimeout(() => {
            // Create nodes representing banks
            const nodes = Array.from({ length: simulationParams.nodes }, (_, i) => ({
                id: i,
                name: `Bank ${i + 1}`,
                assets: 100 + Math.random() * 100,
                liabilities: 50 + Math.random() * 100,
                externalAssets: 50 + Math.random() * 50,
                defaulted: false,
                x: Math.random() * 600,
                y: Math.random() * 400,
                vx: 0,
                vy: 0
            }));

            // Create links (interbank debts)
            const links = [];
            for (let i = 0; i < nodes.length; i++) {
                for (let j = 0; j < nodes.length; j++) {
                    if (i !== j && Math.random() < simulationParams.connections) {
                        const debt = 5 + Math.random() * 15;
                        links.push({
                            source: i,
                            target: j,
                            value: debt
                        });

                        // Add the debt to the bank's balance sheet
                        nodes[i].liabilities += debt;
                        nodes[j].assets += debt;
                    }
                }
            }

            // Calculate initial net values
            nodes.forEach(node => {
                node.netValue = node.assets - node.liabilities;
                node.defaulted = node.netValue < 0;
            });

            setNetwork({ nodes, links });

            // Run shock simulation
            const simulationData = simulateContagion(nodes, links, simulationParams.shockMagnitude);

            setSimulationResults(simulationData);
            setIsSimulating(false);
        }, 1000);
    };

    // Simulate contagion in the banking network
    const simulateContagion = (nodes, links, shockMagnitude) => {
        // Deep copy nodes to avoid mutating original
        const simulatedNodes = JSON.parse(JSON.stringify(nodes));

        // Apply initial shock to random bank's external assets
        const shockedBankIndex = Math.floor(Math.random() * simulatedNodes.length);
        const shockedBank = simulatedNodes[shockedBankIndex];

        // Reduce external assets by shock magnitude
        const shockAmount = shockedBank.externalAssets * shockMagnitude;
        shockedBank.externalAssets -= shockAmount;
        shockedBank.assets -= shockAmount;
        shockedBank.netValue = shockedBank.assets - shockedBank.liabilities;

        // Check if bank defaults
        shockedBank.defaulted = shockedBank.netValue < 0;

        // Track defaults at each iteration
        const defaultsByIteration = [simulatedNodes.filter(n => n.defaulted).length];
        const iterations = [0];

        // Simulate contagion for multiple iterations
        let iteration = 1;
        let anyNewDefaults = true;
        let paymentVector = simulatedNodes.map(n => n.liabilities);

        while (anyNewDefaults && iteration < 10) {
            anyNewDefaults = false;

            // Calculate payment vector using Eisenberg-Noe algorithm (simplified)
            // In a real implementation, this would solve the fixed point problem

            // Check which banks default in this iteration
            simulatedNodes.forEach((bank, i) => {
                if (!bank.defaulted) {
                    // Recalculate assets based on defaulted counterparties
                    let newAssets = bank.externalAssets;

                    // Add payments from other banks
                    links.forEach(link => {
                        if (link.target === i) {
                            const sourceBank = simulatedNodes[link.source];
                            // If source bank is defaulted, they pay proportionally less
                            const paymentRatio = sourceBank.defaulted
                                ? Math.max(0, sourceBank.assets / sourceBank.liabilities)
                                : 1;

                            newAssets += link.value * paymentRatio;
                        }
                    });

                    bank.assets = newAssets;
                    bank.netValue = bank.assets - bank.liabilities;

                    // Check if bank defaults in this iteration
                    if (bank.netValue < 0) {
                        bank.defaulted = true;
                        anyNewDefaults = true;
                    }
                }
            });

            // Record defaults for this iteration
            defaultsByIteration.push(simulatedNodes.filter(n => n.defaulted).length);
            iterations.push(iteration);
            iteration++;
        }

        // Calculate vulnerability metrics
        const totalBanks = simulatedNodes.length;
        const totalDefaulted = simulatedNodes.filter(n => n.defaulted).length;
        const defaultRate = totalDefaulted / totalBanks;

        // Calculate bank-specific vulnerability indices
        const vulnerabilityIndices = simulatedNodes.map(bank => {
            // Simplified vulnerability index based on connectivity and leverage
            // In a real model, this would be more sophisticated
            const incomingConnections = links.filter(l => l.target === bank.id).length;
            const outgoingConnections = links.filter(l => l.source === bank.id).length;
            const leverage = bank.liabilities / (bank.assets + 0.0001); // Avoid division by zero

            return {
                bankId: bank.id,
                name: bank.name,
                vulnerability: (incomingConnections * 0.7 + outgoingConnections * 0.3) * leverage,
                defaulted: bank.defaulted
            };
        });

        return {
            defaultRate,
            totalDefaulted,
            totalBanks,
            vulnerabilityIndices: vulnerabilityIndices.sort((a, b) => b.vulnerability - a.vulnerability),
            iterations: iterations,
            defaultsByIteration: defaultsByIteration,
            contagionThreshold: simulationParams.connections > 0.3 ? "High" : "Low",
            nodes: simulatedNodes,
            links
        };
    };

    // Render network visualization using D3.js
    useEffect(() => {
        if (!networkRef.current || !network.nodes.length) return;

        // Clear previous visualization
        d3.select(networkRef.current).selectAll("*").remove();

        const width = 800;
        const height = 500;
        const nodeRadius = 12;

        // Create SVG element
        const svg = d3.select(networkRef.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height]);

        // Create tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "rgba(0, 0, 0, 0.7)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 5])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        // Create container for all elements
        const g = svg.append("g");

        // Prepare the data for D3
        const nodes = network.nodes.map(node => ({...node}));
        const links = network.links.map(link => ({
            ...link,
            source: nodes[link.source],
            target: nodes[link.target]
        }));

        // Create the force simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(80))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(nodeRadius * 1.5));

        // Create links
        const link = g.selectAll(".link")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke", "#aaa")
            .attr("stroke-width", d => Math.sqrt(d.value))
            .attr("stroke-opacity", 0.6);

        // Create node groups
        const node = g.selectAll(".node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // Add circles to nodes
        node.append("circle")
            .attr("r", nodeRadius)
            .attr("fill", d => d.defaulted ? "rgba(255, 50, 50, 0.8)" : "rgba(50, 150, 255, 0.8)")
            .attr("stroke", d => d.defaulted ? "rgba(200, 0, 0, 0.8)" : "rgba(0, 100, 200, 0.8)")
            .attr("stroke-width", 2)
            .on("mouseover", function(event, d) {
                d3.select(this).attr("r", nodeRadius * 1.2);
                tooltip
                    .style("visibility", "visible")
                    .html(`
                        <strong>${d.name}</strong><br/>
                        Actifs: ${d.assets.toFixed(2)}<br/>
                        Dettes: ${d.liabilities.toFixed(2)}<br/>
                        Valeur nette: ${(d.assets - d.liabilities).toFixed(2)}<br/>
                        ${d.defaulted ? "<span style='color:red'>En défaut</span>" : "<span style='color:green'>Stable</span>"}
                    `);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("r", nodeRadius);
                tooltip.style("visibility", "hidden");
            });

        // Add text labels
        node.append("text")
            .attr("dy", -nodeRadius - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .text(d => d.name);

        // Drag functions
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // Update positions on each tick
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

        // Cleanup function
        return () => {
            tooltip.remove();
            simulation.stop();
        };
    }, [network]);

    // Chart options
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
                    text: 'Itération'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Nombre de banques en défaut'
                }
            }
        }
    };

    // Data for the contagion chart
    const contagionChartData = simulationResults ? {
        labels: simulationResults.iterations,
        datasets: [
            {
                label: 'Banques en défaut',
                data: simulationResults.defaultsByIteration,
                borderColor: 'rgba(200, 80, 192, 1)',
                backgroundColor: 'rgba(200, 80, 192, 0.2)',
                tension: 0.3
            }
        ]
    } : null;

    return (
        <section className="section" style={{ paddingTop: '120px' }}>
            <div className="container">
                <Link to="/projects" className="btn-secondary" style={{ marginBottom: '2rem', display: 'inline-block' }}>
                    ← Retour aux projets
                </Link>

                <h1 className="section-title">Dynamique Stochastique sur Réseaux Financiers</h1>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div>
                        {/* Tabs navigation */}
                        <div className="result-tabs" style={{
                            display: 'flex',
                            borderBottom: '1px solid var(--color-border)',
                            marginBottom: '2rem'
                        }}>
                            <div
                                className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('overview')}
                                style={{
                                    padding: '1rem',
                                    flex: 1,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    borderBottom: activeTab === 'overview' ? '2px solid var(--color-primary)' : 'none',
                                    fontWeight: activeTab === 'overview' ? '600' : '400',
                                    color: activeTab === 'overview' ? 'var(--color-primary)' : 'var(--color-text)'
                                }}
                            >
                                Aperçu du Projet
                            </div>

                            <div
                                className={`tab ${activeTab === 'simulation' ? 'active' : ''}`}
                                onClick={() => setActiveTab('simulation')}
                                style={{
                                    padding: '1rem',
                                    flex: 1,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    borderBottom: activeTab === 'simulation' ? '2px solid var(--color-primary)' : 'none',
                                    fontWeight: activeTab === 'simulation' ? '600' : '400',
                                    color: activeTab === 'simulation' ? 'var(--color-primary)' : 'var(--color-text)'
                                }}
                            >
                                Simulation Interactive
                            </div>

                            <div
                                className={`tab ${activeTab === 'roadmap' ? 'active' : ''}`}
                                onClick={() => setActiveTab('roadmap')}
                                style={{
                                    padding: '1rem',
                                    flex: 1,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    borderBottom: activeTab === 'roadmap' ? '2px solid var(--color-primary)' : 'none',
                                    fontWeight: activeTab === 'roadmap' ? '600' : '400',
                                    color: activeTab === 'roadmap' ? 'var(--color-primary)' : 'var(--color-text)'
                                }}
                            >
                                Parcours de Recherche
                            </div>
                        </div>

                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div>
                                <h2>Description du projet</h2>
                                <p style={{ marginBottom: '1rem' }}>
                                    Ce projet de recherche explore la dynamique stochastique des réseaux financiers,
                                    en mettant l'accent sur la modélisation des phénomènes de contagion financière
                                    et la propagation des défauts bancaires à travers le système financier interconnecté.
                                </p>

                                <p style={{ marginBottom: '2rem' }}>
                                    Les crises financières récentes ont mis en évidence l'importance de comprendre
                                    comment les défaillances d'institutions financières peuvent se propager à travers
                                    le réseau bancaire. Ce projet vise à modéliser mathématiquement ces dynamiques
                                    et à identifier les seuils critiques au-delà desquels les interconnexions entre
                                    institutions deviennent une source de risque systémique plutôt qu'un mécanisme
                                    de diversification bénéfique.
                                </p>

                                <h2>Méthodologie</h2>
                                <ol style={{ marginBottom: '2rem', paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <strong>Modélisation des bilans bancaires</strong> - Représentation des institutions
                                        financières par leurs actifs (dont les prêts interbancaires) et leurs dettes, avec
                                        une attention particulière à leur valeur nette.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <strong>Construction de la matrice d'adjacence</strong> - Formalisation des
                                        interconnexions bancaires à travers une matrice d'adjacence pondérée, où les
                                        poids représentent les montants des expositions interbancaires.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <strong>Modélisation des chocs exogènes</strong> - Introduction de vecteurs de
                                        chocs qui affectent initialement les actifs extérieurs des banques.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <strong>Calcul des vecteurs de paiement</strong> - Détermination des paiements
                                        interbancaires après un choc via la résolution d'un problème de point fixe
                                        (algorithme d'Eisenberg-Noe).
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <strong>Analyse de la vulnérabilité</strong> - Développement d'un indice de
                                        vulnérabilité pour quantifier la sensibilité des institutions aux chocs et
                                        à la contagion, permettant d'identifier les nœuds critiques du réseau.
                                    </li>
                                </ol>

                                <h2>Résultats attendus</h2>
                                <ul style={{ marginBottom: '2rem', paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Identification des seuils critiques d'interconnexion au-delà desquels
                                        le risque systémique augmente significativement.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Caractérisation des structures de réseau qui sont les plus résilientes
                                        ou les plus vulnérables aux phénomènes de contagion.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Développement d'indicateurs de vulnérabilité relative permettant
                                        d'identifier les institutions dont la défaillance aurait les
                                        conséquences les plus graves sur l'ensemble du système.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Analyse comparative des différents modèles de contagion
                                        (Eisenberg-Noe, Rogers-Veraart, etc.) dans divers scénarios de choc.
                                    </li>
                                </ul>

                                <h2>Technologies utilisées</h2>
                                <div className="project-tags" style={{ marginBottom: '2rem' }}>
                                    <span className="project-tag">Python</span>
                                    <span className="project-tag">NetworkX</span>
                                    <span className="project-tag">NumPy</span>
                                    <span className="project-tag">Matplotlib</span>
                                    <span className="project-tag">SciPy</span>
                                    <span className="project-tag">Analyse de Réseaux</span>
                                    <span className="project-tag">Théorie des Graphes</span>
                                    <span className="project-tag">Finance Quantitative</span>
                                    <span className="project-tag">Processus Stochastiques</span>
                                </div>

                                <h2>Aperçu du code</h2>
                                <SyntaxHighlighter
                                    language="python"
                                    style={docco}
                                    customStyle={{
                                        backgroundColor: '#f0ebff',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        marginBottom: '2rem',
                                        border: '1px solid #e0d8ff'
                                    }}
                                >
                                    {`# Implémentation du modèle Eisenberg-Noe pour la contagion financière
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt

def eisenberg_noe_clearing(L, e, max_iterations=100, tol=1e-6):
    """
    Calcule le vecteur de paiement d'équilibre selon le modèle Eisenberg-Noe
    
    Paramètres:
    L (numpy.ndarray): Matrice des engagements interbancaires
    e (numpy.ndarray): Vecteur des actifs externes
    max_iterations: Nombre maximal d'itérations
    tol: Tolérance pour la convergence
    
    Retourne:
    numpy.ndarray: Vecteur de paiement d'équilibre
    """
    n = len(e)
    p_bar = np.sum(L, axis=1)  # Vecteur des engagements totaux
    
    # Matrice des proportions
    Pi = np.zeros((n, n))
    for i in range(n):
        if p_bar[i] > 0:
            Pi[i, :] = L[i, :] / p_bar[i]
    
    # Algorithme de point fixe
    p = p_bar.copy()
    for _ in range(max_iterations):
        p_new = np.minimum(p_bar, e + Pi.T @ p)
        if np.linalg.norm(p_new - p) < tol:
            return p_new
        p = p_new
    
    return p

def calculate_vulnerability_index(G, L, e, shocks):
    """
    Calcule l'indice de vulnérabilité pour chaque nœud du réseau
    
    Paramètres:
    G (networkx.DiGraph): Graphe dirigé représentant le réseau interbancaire
    L (numpy.ndarray): Matrice des engagements interbancaires
    e (numpy.ndarray): Vecteur des actifs externes initial
    shocks (list): Liste des chocs à simuler
    
    Retourne:
    dict: Indice de vulnérabilité pour chaque nœud
    """
    n = len(G.nodes())
    vulnerability = {node: 0 for node in G.nodes()}
    
    # Pour chaque scénario de choc
    for shock in shocks:
        e_shocked = e.copy()
        e_shocked[shock['node']] *= (1 - shock['magnitude'])
        
        # Calcul du vecteur de paiement d'équilibre
        p = eisenberg_noe_clearing(L, e_shocked)
        
        # Calcul des défauts
        defaults = p < np.sum(L, axis=1) - 1e-6
        
        # Mise à jour de l'indice de vulnérabilité
        for i, node in enumerate(G.nodes()):
            if defaults[i]:
                vulnerability[node] += 1
    
    # Normalisation
    num_shocks = len(shocks)
    for node in vulnerability:
        vulnerability[node] /= num_shocks
    
    return vulnerability

# Exemple d'utilisation
def simulate_network_contagion():
    # Création d'un réseau aléatoire
    n = 10  # Nombre de banques
    p = 0.2  # Probabilité de connexion
    
    G = nx.gnp_random_graph(n, p, directed=True)
    
    # Génération des bilans aléatoires
    np.random.seed(42)
    external_assets = np.random.uniform(50, 150, n)
    
    # Matrice des engagements interbancaires
    L = np.zeros((n, n))
    for i, j in G.edges():
        L[i, j] = np.random.uniform(5, 20)
    
    # Vecteur des actifs externes
    e = external_assets.copy()
    
    # Définition des scénarios de choc
    shocks = [
        {'node': i, 'magnitude': 0.5} for i in range(n)
    ]
    
    # Calcul de l'indice de vulnérabilité
    vulnerability = calculate_vulnerability_index(G, L, e, shocks)
    
    # Visualisation du réseau avec indice de vulnérabilité
    pos = nx.spring_layout(G)
    node_colors = [vulnerability[node] for node in G.nodes()]
    
    plt.figure(figsize=(10, 8))
    nx.draw_networkx(G, pos, node_color=node_colors, 
                    node_size=800, cmap=plt.cm.Reds, 
                    with_labels=True)
    
    edge_labels = {(i, j): f"{L[i, j]:.1f}" for i, j in G.edges()}
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)
    
    plt.title("Réseau interbancaire avec indice de vulnérabilité")
    plt.colorbar(plt.cm.ScalarMappable(cmap=plt.cm.Reds), 
                label="Indice de vulnérabilité")
    plt.axis('off')
    plt.tight_layout()
    
    return G, L, e, vulnerability`}
                                </SyntaxHighlighter>
                            </div>
                        )}

                        {/* Simulation Tab */}
                        {activeTab === 'simulation' && (
                            <div>
                                <h2>Simulation de Contagion Financière</h2>
                                <p style={{ marginBottom: '1.5rem' }}>
                                    Cette simulation interactive vous permet d'explorer les dynamiques de
                                    contagion financière dans un réseau bancaire. Ajustez les paramètres
                                    pour observer comment les défauts se propagent à travers le réseau et
                                    quels facteurs influencent la stabilité systémique.
                                </p>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '3fr 1fr',
                                    gap: '1.5rem',
                                    position: 'relative'
                                }}>
                                    {/* Network Visualization - Now takes more space */}
                                    <div style={{
                                        background: 'var(--color-background)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px var(--color-border)'
                                    }}>
                                        <h3>Visualisation du Réseau</h3>
                                        <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(50, 150, 255, 0.8)', marginRight: '5px' }}></span> Banques stables
                                            &nbsp;&nbsp;
                                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(255, 50, 50, 0.8)', marginRight: '5px' }}></span> Banques en défaut
                                        </p>
                                        <div style={{ height: '500px', marginBottom: '1rem', overflow: 'hidden' }}>
                                            <svg
                                                ref={networkRef}
                                                width="800"
                                                height="500"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#f8f8ff'
                                                }}
                                            ></svg>
                                            <div style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem' }}>
                                                <em>Conseil : Utilisez la molette pour zoomer et cliquez-glissez pour déplacer les nœuds</em>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Simulation Controls - Now sticky */}
                                    <div style={{
                                        background: 'var(--color-background)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px var(--color-border)',
                                        position: 'sticky',
                                        top: '100px',
                                        height: 'fit-content'
                                    }}>
                                        <h3>Paramètres de Simulation</h3>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Nombre de banques
                                            </label>
                                            <input
                                                type="range"
                                                name="nodes"
                                                min="5"
                                                max="20"
                                                value={simulationParams.nodes}
                                                onChange={handleParamChange}
                                                style={{ width: '100%' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>5</span>
                                                <span>{simulationParams.nodes}</span>
                                                <span>20</span>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Densité des connexions
                                            </label>
                                            <input
                                                type="range"
                                                name="connections"
                                                min="0.05"
                                                max="0.5"
                                                step="0.05"
                                                value={simulationParams.connections}
                                                onChange={handleParamChange}
                                                style={{ width: '100%' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Faible</span>
                                                <span>{(simulationParams.connections * 100).toFixed(0)}%</span>
                                                <span>Élevée</span>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Magnitude du choc initial
                                            </label>
                                            <input
                                                type="range"
                                                name="shockMagnitude"
                                                min="0.1"
                                                max="0.9"
                                                step="0.1"
                                                value={simulationParams.shockMagnitude}
                                                onChange={handleParamChange}
                                                style={{ width: '100%' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Faible</span>
                                                <span>{(simulationParams.shockMagnitude * 100).toFixed(0)}%</span>
                                                <span>Sévère</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={runSimulation}
                                            className="btn-primary"
                                            style={{ width: '100%' }}
                                            disabled={isSimulating}
                                        >
                                            {isSimulating ? 'Simulation en cours...' : 'Lancer la simulation'}
                                        </button>
                                    </div>
                                </div>

                                {/* Simulation Results */}
                                {simulationResults && (
                                    <div style={{
                                        background: 'var(--color-background)',
                                        padding: '1.5rem',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px var(--color-border)',
                                        marginBottom: '2rem'
                                    }}>
                                        <h3>Résultats de la Simulation</h3>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '1.5rem',
                                            marginBottom: '1.5rem'
                                        }}>
                                            <div>
                                                <h4>Statistiques générales</h4>
                                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                                    <li style={{ marginBottom: '0.5rem' }}>
                                                        <strong>Taux de défaut final:</strong> {(simulationResults.defaultRate * 100).toFixed(1)}%
                                                    </li>
                                                    <li style={{ marginBottom: '0.5rem' }}>
                                                        <strong>Nombre de banques en défaut:</strong> {simulationResults.totalDefaulted} / {simulationResults.totalBanks}
                                                    </li>
                                                    <li style={{ marginBottom: '0.5rem' }}>
                                                        <strong>Seuil de contagion estimé:</strong> {simulationResults.contagionThreshold}
                                                    </li>
                                                </ul>
                                            </div>

                                            <div>
                                                <h4>Évolution des défauts</h4>
                                                <div style={{ height: '200px' }}>
                                                    <Line
                                                        data={contagionChartData}
                                                        options={chartOptions}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <h4>Indices de vulnérabilité</h4>
                                        <div style={{
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '8px',
                                            padding: '0.5rem'
                                        }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                <tr>
                                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Banque</th>
                                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Indice de vulnérabilité</th>
                                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Statut</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {simulationResults.vulnerabilityIndices.map((bank, index) => (
                                                    <tr key={index}>
                                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>{bank.name}</td>
                                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>{bank.vulnerability.toFixed(3)}</td>
                                                        <td style={{
                                                            padding: '0.5rem',
                                                            borderBottom: '1px solid var(--color-border)',
                                                            color: bank.defaulted ? 'red' : 'green',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {bank.defaulted ? 'En défaut' : 'Stable'}
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div style={{ marginTop: '1.5rem' }}>
                                            <h4>Analyse et conclusion</h4>
                                            <p>
                                                Cette simulation démontre {simulationResults.defaultRate > 0.3 ?
                                                'une forte propagation de la contagion financière' :
                                                'une résistance du réseau à la contagion financière'}.
                                                La densité des connexions interbancaires semble {simulationParams.connections > 0.3 ?
                                                'amplifier' :
                                                'absorber'} les chocs, ce qui suggère
                                                {simulationParams.connections > 0.3 ?
                                                    ' qu\'un réseau moins dense pourrait être plus stable dans ce scénario.' :
                                                    ' qu\'un certain niveau d\'interconnexion peut renforcer la stabilité systémique.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(200, 80, 192, 0.1) 100%)',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    marginBottom: '1rem',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                                }}>
                                    <h3>Limitations de la simulation</h3>
                                    <p>
                                        Cette simulation est une version simplifiée des modèles réels utilisés dans la recherche.
                                        Dans un contexte de recherche complète, nous prendrions en compte:
                                    </p>
                                    <ul style={{ marginTop: '0.5rem' }}>
                                        <li>La résolution exacte du problème de point fixe pour le vecteur de paiement</li>
                                        <li>L'hétérogénéité des bilans bancaires et des règles de priorité des créanciers</li>
                                        <li>Les effets des prix des actifs et les ventes en urgence (fire sales)</li>
                                        <li>Les différents types de chocs et leurs distributions de probabilité</li>
                                        <li>La dynamique temporelle des ajustements de bilan</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Roadmap Tab */}
                        {activeTab === 'roadmap' && (
                            <div>
                                <h2>Parcours de Recherche</h2>
                                <p style={{ marginBottom: '1.5rem' }}>
                                    Ce parcours détaille l'évolution de ma recherche sur la dynamique stochastique
                                    des réseaux financiers, de la compréhension initiale du sujet à l'exploration
                                    des modèles avancés et des simulations.
                                </p>

                                <div style={{
                                    position: 'relative',
                                    paddingLeft: '2rem',
                                    marginBottom: '2rem'
                                }}>
                                    {/* Vertical timeline line */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '0.75rem',
                                        top: '0',
                                        bottom: '0',
                                        width: '2px',
                                        background: 'var(--gradient-primary)'
                                    }}></div>

                                    {/* Timeline entries */}
                                    <div style={{ marginBottom: '2rem', position: 'relative' }}>
                                        {/* Timeline dot */}
                                        <div style={{
                                            position: 'absolute',
                                            left: '-2.3rem',
                                            top: '0.5rem',
                                            width: '1rem',
                                            height: '1rem',
                                            borderRadius: '50%',
                                            background: 'var(--gradient-primary)'
                                        }}></div>

                                        <h3>Février 2025 - Phase d'exploration initiale</h3>
                                        <p style={{ marginBottom: '0.5rem' }}>
                                            Durant le premier mois au laboratoire, j'ai exploré la portée du sujet
                                            et ses applications potentielles en finance:
                                        </p>
                                        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                                            <li>Lecture de l'article "The spread of innovations in social networks" (Montanari & Saberi)</li>
                                            <li>Exploration des concepts fondamentaux de la théorie des réseaux</li>
                                            <li>Discussions avec mes superviseurs pour préciser l'orientation du projet</li>
                                        </ul>
                                        <div className="project-tags">
                                            <span className="project-tag">Théorie des réseaux</span>
                                            <span className="project-tag">Diffusion d'innovations</span>
                                            <span className="project-tag">Sciences sociales</span>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '2rem', position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute',
                                            left: '-2.3rem',
                                            top: '0.5rem',
                                            width: '1rem',
                                            height: '1rem',
                                            borderRadius: '50%',
                                            background: 'var(--gradient-primary)'
                                        }}></div>

                                        <h3>Mars 2025 - Focalisation sur les réseaux financiers</h3>
                                        <p style={{ marginBottom: '0.5rem' }}>
                                            Après plusieurs échanges avec mes superviseurs, j'ai réorienté mes lectures
                                            vers des modèles spécifiquement adaptés aux réseaux financiers:
                                        </p>
                                        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                                            <li>Lecture des travaux fondamentaux d'Eisenberg et Noe sur les systèmes de paiement interbancaires</li>
                                            <li>Étude de l'article "Contagion in Financial Networks" par Glasserman et Young</li>
                                            <li>Évaluation des différents indicateurs de contagion financière</li>
                                        </ul>
                                        <div className="project-tags">
                                            <span className="project-tag">Systèmes de paiement</span>
                                            <span className="project-tag">Contagion financière</span>
                                            <span className="project-tag">Modèle Eisenberg-Noe</span>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '2rem', position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute',
                                            left: '-2.3rem',
                                            top: '0.5rem',
                                            width: '1rem',
                                            height: '1rem',
                                            borderRadius: '50%',
                                            background: 'var(--gradient-primary)'
                                        }}></div>

                                        <h3>Avril 2025 - Développement du modèle</h3>
                                        <p style={{ marginBottom: '0.5rem' }}>
                                            J'ai commencé à développer mon propre modèle en me concentrant sur les
                                            interconnexions bancaires à travers les dettes:
                                        </p>
                                        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                                            <li>Modélisation des bilans bancaires simplifiés (actifs et dettes)</li>
                                            <li>Conception d'une représentation matricielle (matrice d'adjacence pondérée)</li>
                                            <li>Élaboration d'un vecteur de vulnérabilité pour quantifier la sensibilité des banques aux chocs</li>
                                            <li>Implémentation préliminaire en Python avec NetworkX et NumPy</li>
                                        </ul>
                                        <div className="project-tags">
                                            <span className="project-tag">Bilans bancaires</span>
                                            <span className="project-tag">Matrice d'adjacence</span>
                                            <span className="project-tag">Indice de vulnérabilité</span>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '0', position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute',
                                            left: '-2.3rem',
                                            top: '0.5rem',
                                            width: '1rem',
                                            height: '1rem',
                                            borderRadius: '50%',
                                            background: 'var(--gradient-primary)'
                                        }}></div>

                                        <h3>Mai 2025 - Simulations et analyses</h3>
                                        <p style={{ marginBottom: '0.5rem' }}>
                                            Phase actuelle: je mène des simulations pour tester les effets de différents
                                            paramètres et structures de réseau sur la contagion financière:
                                        </p>
                                        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                                            <li>Implémentation de l'algorithme d'Eisenberg-Noe pour le calcul des vecteurs de paiement</li>
                                            <li>Simulations de chocs avec différentes structures de réseau et densités de connections</li>
                                            <li>Analyse des seuils critiques à partir desquels la contagion s'accélère</li>
                                            <li>Développement de visualisations pour mieux comprendre les dynamiques du réseau</li>
                                        </ul>
                                        <div className="project-tags">
                                            <span className="project-tag">Simulations Monte Carlo</span>
                                            <span className="project-tag">Analyse de seuils critiques</span>
                                            <span className="project-tag">Visualisation de réseaux</span>
                                        </div>
                                    </div>
                                </div>

                                <h2>Prochaines étapes</h2>
                                <ul style={{ marginBottom: '2rem', paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <strong>Raffinement du modèle</strong> - Introduction de l'hétérogénéité des
                                        banques et des contrats d'obligations avec différentes priorités.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <strong>Expansion aux effets de prix</strong> - Intégration des effets de
                                        liquidation forcée (fire sales) et leur impact sur les prix des actifs.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <strong>Validation empirique</strong> - Confrontation du modèle avec des
                                        données réelles de réseaux interbancaires (si accessibles).
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <strong>Rédaction du rapport de recherche</strong> - Synthèse des résultats
                                        et élaboration d'un article de recherche sur le sujet.
                                    </li>
                                </ul>

                                <h2>Lectures clés</h2>
                                <ul style={{ paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Montanari, A., & Saberi, A. (2010).
                                        <em> The spread of innovations in social networks.</em>
                                        Proceedings of the National Academy of Sciences.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Eisenberg, L., & Noe, T. H. (2001).
                                        <em> Systemic risk in financial systems.</em>
                                        Management Science.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Glasserman, P., & Young, H. P. (2016).
                                        <em> Contagion in Financial Networks.</em>
                                        Journal of Economic Literature.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Jackson, M. O. (2010).
                                        <em> Social and Economic Networks.</em>
                                        Princeton University Press.
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Rogers, L. C. G., & Veraart, L. A. M. (2013).
                                        <em> Failure and rescue in an interbank network.</em>
                                        Management Science.
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div>
                        <div style={{
                            background: 'var(--color-background)',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            boxShadow: '0 5px 15px var(--color-border)',
                            position: 'sticky',
                            top: '100px'
                        }}>
                            <h3>Détails du projet</h3>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Date</h4>
                                <p>Février 2025 - Juillet 2025</p>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Lieu</h4>
                                <p>INRIA Grenoble - Équipe Polaris</p>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Encadrants</h4>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    <li>Nicolas Gast</li>
                                    <li>Frederica Garin</li>
                                    <li>Paolo Fresca</li>
                                </ul>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Catégorie</h4>
                                <p>Finance Quantitative, Théorie des Réseaux, Dynamiques Stochastiques</p>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Technologies</h4>
                                <div className="project-tags" style={{ marginTop: '0.5rem' }}>
                                    <span className="project-tag">Python</span>
                                    <span className="project-tag">NetworkX</span>
                                    <span className="project-tag">Finance</span>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>État du projet</h4>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    backgroundColor: 'rgba(108, 99, 255, 0.2)',
                                    borderRadius: '4px',
                                    marginTop: '0.5rem',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: '55%',
                                        height: '100%',
                                        background: 'var(--gradient-primary)'
                                    }}></div>
                                </div>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', textAlign: 'center' }}>
                                    En cours (55% complété)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default NetworkDynamics;