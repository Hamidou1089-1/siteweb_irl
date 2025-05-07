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
    // Ref for network visualization
    const networkRef = useRef(null);

    // State for simulation parameters
    const [simulationParams, setSimulationParams] = useState({
        numBanks: 10,
        connectionProb: 0.2,
        maxShockMagnitude: 0.9,
        shockSteps: 20
    });

    // States for simulation results
    const [simulationResults, setSimulationResults] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // State for network visualization
    const [network, setNetwork] = useState({
        nodes: [],
        links: [],
        obligationMatrix: []
    });

    // Handle parameter changes
    const handleParamChange = (e) => {
        const { name, value } = e.target;
        setSimulationParams(prev => ({
            ...prev,
            [name]: parseFloat(value)
        }));
    };

    // Generate Erdös-Rényi network
    const generateErdosRenyiNetwork = () => {
        const { numBanks, connectionProb } = simulationParams;

        // Create nodes (banks)
        const nodes = Array.from({ length: numBanks }, (_, i) => ({
            id: i,
            name: `Banque ${i + 1}`,
            externalAssets: 80 + Math.random() * 40,
            externalLiabilities: 20 + Math.random() * 20,
            netWorth: 0,
            defaulted: false,
            x: Math.random() * 600,
            y: Math.random() * 400
        }));

        // Create obligation matrix and links (interbank obligations)
        const links = [];
        const obligationMatrix = Array(numBanks).fill().map(() => Array(numBanks).fill(0));

        for (let i = 0; i < numBanks; i++) {
            for (let j = 0; j < numBanks; j++) {
                if (i !== j && Math.random() < connectionProb) {
                    const obligation = 5 + Math.random() * 15;
                    obligationMatrix[i][j] = obligation;

                    links.push({
                        source: i,
                        target: j,
                        value: obligation
                    });
                }
            }
        }

        // Calculate net worth for each bank
        for (let i = 0; i < numBanks; i++) {
            const interbankAssets = obligationMatrix.reduce((sum, row, idx) => sum + row[i], 0);
            const interbankLiabilities = obligationMatrix[i].reduce((sum, val) => sum + val, 0);

            nodes[i].interbankAssets = interbankAssets;
            nodes[i].interbankLiabilities = interbankLiabilities;
            nodes[i].totalAssets = nodes[i].externalAssets + interbankAssets;
            nodes[i].totalLiabilities = nodes[i].externalLiabilities + interbankLiabilities;
            nodes[i].netWorth = nodes[i].totalAssets - nodes[i].totalLiabilities;
        }

        return {
            nodes,
            links,
            obligationMatrix
        };
    };

    // Eisenberg-Noe algorithm for clearing payments
    const computeClearingPayments = (obligationMatrix, shock, externalAssets, maxIterations = 100, tol = 1e-6) => {
        const n = obligationMatrix.length;

        // Calculate total obligations (p_bar)
        const duePayments = obligationMatrix.map(row =>
            row.reduce((sum, val) => sum + val, 0)
        );

        // Calculate proportional obligations matrix
        const relativeObligations = Array(n).fill().map((_, i) => {
            if (duePayments[i] > 0) {
                return obligationMatrix[i].map(val => val / duePayments[i]);
            }
            return Array(n).fill(0);
        });

        // Fixed point iteration
        let payments = [...duePayments];
        let newPayments;

        for (let iter = 0; iter < maxIterations; iter++) {
            // Calculate payments received by each bank
            const paymentsReceived = Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    paymentsReceived[j] += relativeObligations[i][j] * payments[i];
                }
            }

            // Update payments
            newPayments = duePayments.map((p, i) =>
                Math.min(p, Math.max(0, paymentsReceived[i] + externalAssets[i] - shock[i]))
            );

            // Check convergence
            let maxDiff = 0;
            for (let i = 0; i < n; i++) {
                maxDiff = Math.max(maxDiff, Math.abs(newPayments[i] - payments[i]));
            }

            if (maxDiff < tol) {
                return newPayments;
            }

            payments = [...newPayments];
        }

        return payments;
    };

    // Simulate contagion with shock vector
    const simulateContagion = (network, shockMagnitude) => {
        const { nodes, obligationMatrix } = network;
        const numBanks = nodes.length;

        // Create shock vector (proportional to external assets)
        const shockVector = nodes.map(node => node.externalAssets * shockMagnitude);
        const externalAssets = nodes.map(node => node.externalAssets);

        // Compute clearing payments
        const clearingPayments = computeClearingPayments(
            obligationMatrix,
            shockVector,
            externalAssets
        );

        // Apply results to simulated nodes
        const simulatedNodes = JSON.parse(JSON.stringify(nodes));
        let defaultCount = 0;

        for (let i = 0; i < numBanks; i++) {
            // Calculate actual payments received
            let paymentsReceived = 0;
            for (let j = 0; j < numBanks; j++) {
                if (obligationMatrix[j][i] > 0) {
                    const paymentRatio = clearingPayments[j] / simulatedNodes[j].interbankLiabilities;
                    paymentsReceived += obligationMatrix[j][i] * Math.min(1, paymentRatio);
                }
            }

            // Update node status
            simulatedNodes[i].externalAssets -= shockVector[i];
            simulatedNodes[i].interbankAssets = paymentsReceived;
            simulatedNodes[i].totalAssets = simulatedNodes[i].externalAssets + paymentsReceived;
            simulatedNodes[i].netWorth = simulatedNodes[i].totalAssets - simulatedNodes[i].totalLiabilities;
            simulatedNodes[i].defaulted = simulatedNodes[i].netWorth < 0;

            if (simulatedNodes[i].defaulted) {
                defaultCount++;
            }
        }

        return {
            simulatedNodes,
            clearingPayments,
            defaultCount,
            defaultRate: defaultCount / numBanks
        };
    };

    // Generate shock curve with multiple points
    const generateShockCurve = () => {
        const generatedNetwork = generateErdosRenyiNetwork();
        const { shockSteps, maxShockMagnitude } = simulationParams;

        // Generate data points for different shock magnitudes
        const shockMagnitudes = Array.from({ length: shockSteps }, (_, i) =>
            (i / (shockSteps - 1)) * maxShockMagnitude
        );

        const results = shockMagnitudes.map(magnitude => {
            const result = simulateContagion(generatedNetwork, magnitude);
            return {
                shockMagnitude: magnitude,
                defaultRate: result.defaultRate,
                defaultCount: result.defaultCount
            };
        });

        // Calculate variation of default rate
        const variations = [];
        for (let i = 1; i < results.length; i++) {
            variations.push({
                shockMagnitude: (shockMagnitudes[i] + shockMagnitudes[i-1]) / 2,
                variation: results[i].defaultRate - results[i-1].defaultRate
            });
        }

        // Find critical threshold (peak variation)
        let maxVariation = {variation: 0, shockMagnitude: 0.5};
        for (const v of variations) {
            if (v.variation > maxVariation.variation) {
                maxVariation = v;
            }
        }

        return {
            network: generatedNetwork,
            results,
            variations,
            criticalThreshold: maxVariation.shockMagnitude
        };
    };

    // Run simulation
    const runSimulation = () => {
        setIsSimulating(true);

        // Simulate with delay to allow UI update
        setTimeout(() => {
            const results = generateShockCurve();
            setSimulationResults(results);
            setNetwork(results.network);
            setIsSimulating(false);
        }, 500);
    };

    // Visualize network with D3
    useEffect(() => {
        if (!networkRef.current || !network.nodes || network.nodes.length === 0) return;

        // Clear previous visualization
        d3.select(networkRef.current).selectAll("*").remove();

        const width = 800;
        const height = 500;
        const nodeRadius = 8;

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

        // Prepare data for D3
        const nodes = network.nodes.map(node => ({...node}));
        const links = network.links.map(link => ({
            ...link,
            source: typeof link.source === 'object' ? link.source : nodes[link.source],
            target: typeof link.target === 'object' ? link.target : nodes[link.target]
        }));

        // Create force simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(80))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(nodeRadius * 1.5));

        // Add arrow markers for directed edges
        svg.append("defs").selectAll("marker")
            .data(["arrow"])
            .enter().append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", nodeRadius + 9)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("fill", "#999")
            .attr("d", "M0,-5L10,0L0,5");

        // Create links
        const link = g.selectAll(".link")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke", "#aaa")
            .attr("stroke-width", d => Math.sqrt(d.value) * 0.5)
            .attr("stroke-opacity", 0.6)
            .attr("marker-end", "url(#arrow)");

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
                        Actifs externes: ${d.externalAssets.toFixed(2)}<br/>
                        Actifs interbancaires: ${d.interbankAssets.toFixed(2)}<br/>
                        Dettes externes: ${d.externalLiabilities.toFixed(2)}<br/>
                        Dettes interbancaires: ${d.interbankLiabilities.toFixed(2)}<br/>
                        Valeur nette: ${d.netWorth.toFixed(2)}<br/>
                        ${d.defaulted ? "<span style='color:red'>En défaut</span>" : "<span style='color:green'>Solvable</span>"}
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
            .attr("font-size", "10px")
            .text(d => d.name.replace("Banque", "B"));

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

    // Default chart options
    const defaultChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
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
        }
    };

    // Default rate chart options
    const defaultRateChartOptions = {
        ...defaultChartOptions,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Mesure du Choc'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Proportion de Défauts'
                },
                min: 0,
                max: 1
            }
        }
    };

    // Variation chart options
    const variationChartOptions = {
        ...defaultChartOptions,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Mesure du Choc'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Variation de la Proportion de Défauts'
                }
            }
        }
    };

    // Data for default rate chart
    const defaultRateChartData = simulationResults ? {
        labels: simulationResults.results.map(r => r.shockMagnitude.toFixed(2)),
        datasets: [
            {
                label: 'Proportion de Défauts',
                data: simulationResults.results.map(r => r.defaultRate),
                borderColor: 'rgba(108, 99, 255, 1)',
                backgroundColor: 'rgba(108, 99, 255, 0.2)',
                tension: 0.3
            }
        ]
    } : null;

    // Data for variation chart
    const variationChartData = simulationResults ? {
        labels: simulationResults.variations.map(v => v.shockMagnitude.toFixed(2)),
        datasets: [
            {
                label: 'Variation de la Proportion de Défauts',
                data: simulationResults.variations.map(v => v.variation),
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
                                className={`tab ${activeTab === 'methodology' ? 'active' : ''}`}
                                onClick={() => setActiveTab('methodology')}
                                style={{
                                    padding: '1rem',
                                    flex: 1,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    borderBottom: activeTab === 'methodology' ? '2px solid var(--color-primary)' : 'none',
                                    fontWeight: activeTab === 'methodology' ? '600' : '400',
                                    color: activeTab === 'methodology' ? 'var(--color-primary)' : 'var(--color-text)'
                                }}
                            >
                                Méthodologie
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

                                <p style={{ marginBottom: '1rem' }}>
                                    Les crises financières récentes, comme celle de 2007-2008, ont mis en évidence l'importance de
                                    comprendre comment les défaillances d'institutions financières peuvent se propager à travers
                                    le réseau bancaire. Ce projet vise à modéliser mathématiquement ces dynamiques
                                    et à identifier les seuils critiques au-delà desquels les interconnexions entre
                                    institutions deviennent une source de risque systémique plutôt qu'un mécanisme
                                    de diversification bénéfique.
                                </p>

                                <p style={{ marginBottom: '2rem' }}>
                                    Notre approche utilise des graphes aléatoires d'Erdös-Rényi pour modéliser les réseaux
                                    interbancaires et l'algorithme d'Eisenberg et Noe pour simuler la propagation des défauts.
                                    L'objectif principal est de quantifier la résilience du réseau face à des chocs exogènes
                                    et d'analyser l'impact de la densité des interconnexions sur cette résilience.
                                </p>

                                <h2>Questions de recherche centrales</h2>
                                <ul style={{ marginBottom: '2rem', paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Dans quelle mesure les interconnexions permettent-elles de réduire l'impact d'un choc exogène?
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        À partir de quel seuil d'interconnexions un choc cesse-t-il d'être dilué pour, au contraire, être amplifié?
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Comment quantifier précisément le risque systémique dans un réseau financier?
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Quel rôle joue le volume du capital échangé entre les banques à travers les dettes dans ce risque?
                                    </li>
                                </ul>

                                <h2>Principaux résultats préliminaires</h2>
                                <p style={{ marginBottom: '1rem' }}>
                                    Nos simulations mettent en évidence un phénomène intéressant : un seuil critique apparaît lorsque l'amplitude
                                    du choc atteint environ 50% de la valeur totale des actifs extérieurs du système. À ce point précis, on
                                    observe une augmentation significative du taux de défaut dans le réseau.
                                </p>

                                <p style={{ marginBottom: '1rem' }}>
                                    Contrairement à ce que suggère la théorie financière classique sur les bénéfices de la diversification,
                                    nos résultats préliminaires indiquent que les réseaux moins connectés semblent plus résilients face aux chocs
                                    que les réseaux densément connectés. Cette observation contre-intuitive mérite une analyse plus approfondie.
                                </p>

                                <div style={{ marginBottom: '2rem' }}>
                                    <div className="project-tags" style={{ marginTop: '2rem' }}>
                                        <span className="project-tag">Finance Quantitative</span>
                                        <span className="project-tag">Théorie des Graphes</span>
                                        <span className="project-tag">Contagion Financière</span>
                                        <span className="project-tag">Risque Systémique</span>
                                        <span className="project-tag">Algorithme d'Eisenberg-Noe</span>
                                        <span className="project-tag">Graphes d'Erdös-Rényi</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveTab('simulation')}
                                    className="btn-primary"
                                    style={{ marginTop: '1rem' }}
                                >
                                    Explorer la simulation interactive
                                </button>
                            </div>
                        )}

                        {/* Simulation Tab */}
                        {activeTab === 'simulation' && (
                            <div>
                                <h2>Simulation de Contagion Financière</h2>
                                <p style={{ marginBottom: '1.5rem' }}>
                                    Cette simulation interactive vous permet d'explorer les dynamiques de contagion financière dans un
                                    réseau bancaire d'Erdös-Rényi. Vous pouvez ajuster les paramètres du réseau et observer comment les
                                    défauts se propagent à travers le système lorsque des chocs exogènes d'amplitudes croissantes sont appliqués.
                                </p>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '3fr 1fr',
                                    gap: '1.5rem',
                                    marginBottom: '1.5rem'
                                }}>
                                    {/* Network Visualization */}
                                    <div style={{
                                        background: 'var(--color-background)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px var(--color-border)'
                                    }}>
                                        <h3>Visualisation du Réseau Interbancaire</h3>
                                        <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(50, 150, 255, 0.8)', marginRight: '5px' }}></span> Banques solvables
                                            &nbsp;&nbsp;
                                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(255, 50, 50, 0.8)', marginRight: '5px' }}></span> Banques en défaut
                                        </p>
                                        <div style={{ height: '500px', marginBottom: '1rem', overflow: 'hidden' }}>
                                            <svg
                                                ref={networkRef}
                                                width="100%"
                                                height="100%"
                                                style={{
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#f8f8ff'
                                                }}
                                            ></svg>
                                            {network.nodes && network.nodes.length > 0 ? (
                                                <div style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem' }}>
                                                    <em>Conseil : Utilisez la molette pour zoomer et cliquez-glissez pour déplacer les nœuds</em>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    textAlign: 'center',
                                                    paddingTop: '200px'
                                                }}>
                                                    <p>Cliquez sur "Lancer la simulation" pour générer un réseau</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Simulation Controls */}
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
                                                name="numBanks"
                                                min="5"
                                                max="30"
                                                value={simulationParams.numBanks}
                                                onChange={handleParamChange}
                                                style={{ width: '100%' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>5</span>
                                                <span>{simulationParams.numBanks}</span>
                                                <span>30</span>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Probabilité de connexion (p)
                                            </label>
                                            <input
                                                type="range"
                                                name="connectionProb"
                                                min="0.1"
                                                max="1"
                                                step="0.1"
                                                value={simulationParams.connectionProb}
                                                onChange={handleParamChange}
                                                style={{ width: '100%' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>5%</span>
                                                <span>{(simulationParams.connectionProb * 100).toFixed(0)}%</span>
                                                <span>100%</span>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Magnitude max. du choc
                                            </label>
                                            <input
                                                type="range"
                                                name="maxShockMagnitude"
                                                min="0.1"
                                                max="1.0"
                                                step="0.1"
                                                value={simulationParams.maxShockMagnitude}
                                                onChange={handleParamChange}
                                                style={{ width: '100%' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>10%</span>
                                                <span>{(simulationParams.maxShockMagnitude * 100).toFixed(0)}%</span>
                                                <span>100%</span>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                                                Points de simulation
                                            </label>
                                            <input
                                                type="range"
                                                name="shockSteps"
                                                min="5"
                                                max="50"
                                                step="5"
                                                value={simulationParams.shockSteps}
                                                onChange={handleParamChange}
                                                style={{ width: '100%' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>5</span>
                                                <span>{simulationParams.shockSteps}</span>
                                                <span>50</span>
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
                                            {/* Default Rate Chart */}
                                            <div>
                                                <h4>Proportion de Défauts vs Mesure du Choc</h4>
                                                <div style={{ height: '300px' }}>
                                                    <Line
                                                        data={defaultRateChartData}
                                                        options={defaultRateChartOptions}
                                                    />
                                                </div>
                                                <div style={{
                                                    textAlign: 'center',
                                                    marginTop: '0.5rem',
                                                    fontSize: '0.9rem',
                                                    color: 'var(--color-text-light)'
                                                }}>
                                                    Ce graphique montre comment la proportion de banques en défaut
                                                    augmente avec l'amplitude du choc exogène.
                                                </div>
                                            </div>

                                            {/* Variation Chart */}
                                            <div>
                                                <h4>Variation de la Proportion de Défauts</h4>
                                                <div style={{ height: '300px' }}>
                                                    <Line
                                                        data={variationChartData}
                                                        options={variationChartOptions}
                                                    />
                                                </div>
                                                <div style={{
                                                    textAlign: 'center',
                                                    marginTop: '0.5rem',
                                                    fontSize: '0.9rem',
                                                    color: 'var(--color-text-light)'
                                                }}>
                                                    Ce graphique met en évidence le seuil critique autour duquel la
                                                    contagion s'accélère dans le réseau.
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '1.5rem' }}>
                                            <h4>Analyse des résultats</h4>
                                            <p style={{ marginBottom: '1rem' }}>
                                                <strong>Seuil critique détecté :</strong> {(simulationResults.criticalThreshold * 100).toFixed(1)}% de la valeur des actifs externes
                                            </p>
                                            <p style={{ marginBottom: '1rem' }}>
                                                Cette simulation confirme l'existence d'un seuil critique dans la propagation des défauts,
                                                {simulationResults.criticalThreshold > 0.45 && simulationResults.criticalThreshold < 0.55 ?
                                                    ' correspondant à environ 50% de la valeur des actifs, ce qui est conforme à nos observations théoriques.' :
                                                    ` situé à ${(simulationResults.criticalThreshold * 100).toFixed(1)}% de la valeur des actifs.`}
                                            </p>
                                            <p>
                                                La densité du réseau (p = {simulationParams.connectionProb.toFixed(2)}) influence la
                                                résilience du système. {simulationParams.connectionProb > 0.5 ?
                                                'Ce réseau densément connecté montre une propagation rapide des défauts au-delà du seuil critique, suggérant que les fortes interconnexions peuvent amplifier la contagion plutôt que la diluer.' :
                                                'Ce réseau peu connecté montre une certaine résistance à la propagation des défauts, mais le seuil critique reste observable.'}
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
                                    <h3>Note sur la simulation</h3>
                                    <p style={{ marginBottom: '1rem' }}>
                                        Cette simulation est une implémentation JavaScript de notre modèle Python original, et
                                        reproduit les principales caractéristiques de notre recherche, notamment l'utilisation
                                        de graphes d'Erdös-Rényi et l'algorithme d'Eisenberg-Noe pour le calcul des vecteurs de paiement.
                                    </p>
                                    <p>
                                        Pour explorer plus en détail la méthodologie et les aspects mathématiques, consultez l'onglet
                                        "Méthodologie". Pour accéder au code source Python complet et aux résultats détaillés de nos recherches,
                                        rendez-vous sur notre dépôt GitHub via le lien dans l'encadré à droite.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Methodology Tab */}
                        {activeTab === 'methodology' && (
                            <div>
                                <h2>Méthodologie détaillée</h2>
                                <p style={{ marginBottom: '1.5rem' }}>
                                    Notre approche méthodologique combine la théorie des graphes aléatoires, les modèles
                                    d'équilibre financier et les simulations numériques pour étudier la contagion dans
                                    les réseaux financiers.
                                </p>

                                <h3>1. Modélisation du réseau financier</h3>
                                <p style={{ marginBottom: '1rem' }}>
                                    Nous représentons le réseau interbancaire par un graphe dirigé pondéré G = (N, E) où:
                                </p>
                                <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        N = {'{1, 2, ..., n}'} représente l'ensemble des banques
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        E ⊆ N × N représente les expositions interbancaires
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        La matrice d'obligations [I] encode les dettes entre banques, où [I]ij représente
                                        la dette de la banque i envers la banque j
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Chaque banque possède également des actifs externes (c) et des dettes externes (b)
                                    </li>
                                </ul>

                                <div className="code-block" style={{
                                    background: '#f0ebff',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem'
                                }}>
                                    <p style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                        Bilan simplifié d'une banque i:<br/>
                                        <br/>
                                        Actifs:<br/>
                                        - Prêts interbancaires: Σj[I]ji<br/>
                                        - Actifs extérieurs: ci<br/>
                                        <br/>
                                        Passifs:<br/>
                                        - Emprunts interbancaires: Σj[I]ij<br/>
                                        - Passifs extérieurs: bi<br/>
                                        <br/>
                                        Valeur nette = Σj[I]ji + ci - Σj[I]ij - bi
                                    </p>
                                </div>

                                <h3>2. Génération du réseau Erdös-Rényi</h3>
                                <p style={{ marginBottom: '1rem' }}>
                                    Pour nos simulations, nous utilisons le modèle de graphe aléatoire d'Erdös-Rényi G(n,p) où:
                                </p>
                                <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        n est le nombre de banques
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        p est la probabilité qu'il existe une arête (obligation) entre deux nœuds
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Les obligations sont générées selon une distribution gamma
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Les actifs extérieurs sont ajustés pour garantir que toutes les banques sont initialement solvables
                                    </li>
                                </ul>

                                <h3>3. Application de chocs exogènes</h3>
                                <p style={{ marginBottom: '1rem' }}>
                                    Nous définissons un choc exogène comme le non-remboursement d'entités extérieures au système bancaire:
                                </p>
                                <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Pour une banque i, le choc xi ∈ [0, ci] représente une réduction de ses actifs extérieurs
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        La mesure de gravité du choc g = ||x|| / ||c|| ∈ [0, 1] quantifie l'amplitude relative du choc
                                    </li>
                                </ul>

                                <h3>4. Algorithme d'Eisenberg-Noe</h3>
                                <p style={{ marginBottom: '1rem' }}>
                                    Pour déterminer les paiements d'équilibre après un choc, nous utilisons l'algorithme itératif d'Eisenberg-Noe:
                                </p>

                                <SyntaxHighlighter
                                    language="python"
                                    style={docco}
                                    customStyle={{
                                        backgroundColor: '#f0ebff',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        marginBottom: '1.5rem',
                                        border: '1px solid #e0d8ff'
                                    }}
                                >
                                    {`def compute_clearing_payments(self, max_iterations: int, shock_vector: np.array) -> np.array:
    """
    Calculates the clearing payments within a financial network. The method iteratively
    computes a vector of payments until it stabilizes (converges), taking into account
    the shock vector, due payments, relative liabilities, and outside assets.

    :param max_iterations: The maximum number of iterations allowed for the convergence
        computation.
    :param shock_vector: A numpy array representing the external shocks applied to
        each node in the financial network.
    :return: A numpy array representing the stabilized vector of payments after
        iterative computation.
    """

    vector_of_payments = self.network.due_payements
    if np.all(shock_vector == 0):
        return vector_of_payments
    while True:
        # Calculer de nouveaux paiements basés sur les paiements actuels
        new_vector_of_payments = np.minimum(self.network.due_payements, np.maximum(self.network.matrix_relative_liabilities.T @ vector_of_payments - shock_vector + self.network.vector_outside_asset,0))

        # Vérifier si nous avons convergé
        if np.allclose(new_vector_of_payments, vector_of_payments, 0.000000001):
            return new_vector_of_payments

        # Mettre à jour pour la prochaine itération
        vector_of_payments = new_vector_of_payments`}
                                </SyntaxHighlighter>

                                <p style={{ marginBottom: '1.5rem' }}>
                                    Cet algorithme trouve le point fixe de la transformation φ(P) = min(P̄, max(0, R^T P - x + c)), où:
                                </p>
                                <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        P̄ représente le vecteur des obligations totales
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        R est la matrice des proportions de dettes (obligations normalisées)
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        x est le vecteur de choc
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        c est le vecteur des actifs externes
                                    </li>
                                </ul>

                                <h3>5. Analyse des résultats</h3>
                                <p style={{ marginBottom: '1rem' }}>
                                    Après avoir calculé les vecteurs de paiement d'équilibre, nous analysons:
                                </p>
                                <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        La proportion de défauts d = (Nombre de défauts / N) en fonction de la mesure du choc g
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        La variation de la proportion de défauts pour identifier les seuils critiques
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        La relation entre la densité du réseau (p) et sa résilience
                                    </li>
                                </ul>

                                <h3>Limites et développements futurs</h3>
                                <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        Notre modèle actuel ne considère que des chocs exogènes, sans prendre en compte les chocs endogènes ou les effets de liquidité
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        La dynamique temporelle des défauts n'est pas pleinement exploitée
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        D'autres topologies de réseau (scale-free, small-world) pourraient offrir des perspectives complémentaires
                                    </li>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        L'influence des cycles dans le réseau sur la propagation des défauts mérite une analyse plus approfondie
                                    </li>
                                </ul>

                                <button
                                    onClick={() => setActiveTab('simulation')}
                                    className="btn-primary"
                                    style={{ marginTop: '1rem' }}
                                >
                                    Retourner à la simulation
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Side Panel */}
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
                                    <span className="project-tag">NumPy</span>
                                    <span className="project-tag">Matplotlib</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
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

                            <div>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Ressources</h4>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    <li style={{ marginBottom: '0.5rem' }}>
                                        <a href="https://github.com/Hamidou1089-1/Stage_Inria_dynamique" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'block', textAlign: 'center' }}>
                                            <i className="fab fa-github" style={{ marginRight: '0.5rem' }}></i>Code source
                                        </a>
                                    </li>
                                    <li>
                                        <a href="/src/assets/rapport_risque_systemique_mai_2025.pdf" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'block', textAlign: 'center' }}>
                                            Rapport préliminaire (PDF)
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Citation */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05) 0%, rgba(200, 80, 192, 0.1) 100%)',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            marginTop: '1.5rem',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                        }}>
                            <h4>Citation clé</h4>
                            <blockquote style={{
                                fontStyle: 'italic',
                                margin: '1rem 0',
                                padding: '0.5rem 1rem',
                                borderLeft: '3px solid var(--color-primary)'
                            }}>
                                "Notre principale observation réside dans l'identification d'un seuil critique lorsque le choc atteint approximativement 50% de la valeur totale des actifs extérieurs du système. Ce seuil se manifeste par un pic dans la variation de la proportion de défauts, suivi d'une relative stabilisation."
                            </blockquote>
                            <p style={{ textAlign: 'right', fontSize: '0.9rem' }}>
                                — Extrait du rapport de recherche, Mai 2025
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default NetworkDynamics;