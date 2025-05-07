import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// La structure principale du modèle financier
const FinancialNetworkModel = () => {
    // États pour les paramètres et résultats de simulation
    const [networkType, setNetworkType] = useState('random');
    const [networkParams, setNetworkParams] = useState({
        random: { nodes: 10, connections: 0.2, initialDefaultProbability: 0.1 },
        corePeriphery: { coreNodes: 5, peripheryNodes: 15, coreConnections: 0.7, peripheryConnections: 0.2 },
        trivial: { nodes: 10 }
    });
    const [simulationParams, setSimulationParams] = useState({
        shockMagnitude: 0.5,
        shockType: 'uniform',
        targetType: 'all',
        maxIterations: 10
    });
    const [network, setNetwork] = useState({ nodes: [], links: [] });
    const [simulationResults, setSimulationResults] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const [simulationSteps, setSimulationSteps] = useState([]);

    // Références pour la visualisation D3
    const networkRef = useRef(null);
    const chartRef = useRef(null);

    // 1. Modèles de Réseau (équivalent des classes Python)

    // Classe de base - Network
    class Network {
        constructor(numberOfBanks) {
            this.numberOfBanks = numberOfBanks;
            this.matrixObligation = Array(numberOfBanks).fill().map(() => Array(numberOfBanks).fill(0));
            this.matrixRelativeLiabilities = Array(numberOfBanks).fill().map(() => Array(numberOfBanks).fill(0));
            this.vectorOutsideAsset = Array(numberOfBanks).fill(0);
            this.vectorOutsideLiabilities = Array(numberOfBanks).fill(0);
            this.duePayments = Array(numberOfBanks).fill(0);
            this.netWorth = Array(numberOfBanks).fill(0);
            this.vulnerabilities = Array(numberOfBanks).fill(0);
            this.banks = Array(numberOfBanks).fill().map(() => null);
            this.defaultVector = Array(numberOfBanks).fill(false);
            this.sumOutsideAssets = 0;
        }

        generateNetwork() {
            // Implémentation spécifique dans les sous-classes
        }

        computeSumOutsideAssets() {
            this.sumOutsideAssets = this.vectorOutsideAsset.reduce((sum, val) => sum + val, 0);
            return this.sumOutsideAssets;
        }

        updateDefaults() {
            this.defaultVector = this.banks.map(bank => bank.isDefault());
            return this.defaultVector;
        }
    }

    // Représentation d'une banque
    class Bank {
        constructor(outsideAsset, asset, outsideLiabilities, liabilities) {
            this.outsideAsset = outsideAsset;
            this.asset = asset;
            this.outsideLiabilities = outsideLiabilities;
            this.liabilities = liabilities;
            this.balance = this.calculateBalance();
            this.isDefaulted = this.balance <= 0;
        }

        calculateBalance() {
            return this.outsideAsset + this.asset - this.outsideLiabilities - this.liabilities;
        }

        updateBalance() {
            this.balance = this.calculateBalance();
            this.isDefaulted = this.balance <= 0;
            return this.balance;
        }

        isDefault() {
            return this.balance <= 0;
        }

        // Getters and setters
        setOutsideAsset(value) {
            this.outsideAsset = value;
        }
    }

    // Réseau aléatoire (Erdős–Rényi)
    class RandomNetwork extends Network {
        constructor(numberOfBanks, probabilityOfLinking) {
            super(numberOfBanks);
            this.probabilityOfLinking = probabilityOfLinking;
        }

        generateNetwork() {
            const n = this.numberOfBanks;

            // Générer les obligations aléatoires entre les banques
            for (let i = 0; i < n; i++) {
                if (Math.random() < this.probabilityOfLinking) {
                    this.vectorOutsideLiabilities[i] = Math.random() * n * n;
                }

                for (let j = 0; j < n; j++) {
                    if (i !== j && Math.random() < this.probabilityOfLinking) {
                        this.matrixObligation[i][j] = this.binomialRandom(n * 100, 0.2);
                    }
                }
            }

            // Calculer ce que chaque banque doit et ce qu'on lui doit
            const jeDois = this.matrixObligation.map(row => row.reduce((sum, val) => sum + val, 0));
            const onMeDoit = Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    onMeDoit[j] += this.matrixObligation[i][j];
                }
            }

            // Générer des actifs externes pour assurer un bilan positif initial
            for (let i = 0; i < n; i++) {
                if (onMeDoit[i] < jeDois[i] + this.vectorOutsideLiabilities[i]) {
                    this.vectorOutsideAsset[i] = Math.abs(jeDois[i] + this.vectorOutsideLiabilities[i] - onMeDoit[i]) +
                        Math.random() * n * n;
                } else {
                    this.vectorOutsideAsset[i] = Math.random() * n * n * n;
                }
            }

            // Calculer les paiements dus
            this.duePayments = jeDois.map((val, i) => val + this.vectorOutsideLiabilities[i]);

            // Calculer les vulnérabilités
            for (let k = 0; k < n; k++) {
                if (this.duePayments[k] === 0) {
                    this.vulnerabilities[k] = 0;
                } else {
                    this.vulnerabilities[k] = (this.duePayments[k] - this.vectorOutsideLiabilities[k]) / this.duePayments[k];
                }
            }

            // Normaliser les vulnérabilités
            const sumVulnerabilities = this.vulnerabilities.reduce((sum, val) => sum + val, 0);
            if (sumVulnerabilities > 0) {
                this.vulnerabilities = this.vulnerabilities.map(v => v / sumVulnerabilities);
            }

            // Calculer la matrice des responsabilités relatives
            for (let k = 0; k < n; k++) {
                for (let j = 0; j < n; j++) {
                    if (this.duePayments[k] === 0) {
                        this.matrixRelativeLiabilities[k][j] = 0;
                    } else {
                        this.matrixRelativeLiabilities[k][j] = this.matrixObligation[k][j] / this.duePayments[k];
                    }
                }
            }

            // Créer les objets banques
            for (let i = 0; i < n; i++) {
                this.banks[i] = new Bank(
                    this.vectorOutsideAsset[i],
                    onMeDoit[i],
                    this.vectorOutsideLiabilities[i],
                    jeDois[i]
                );
                this.netWorth[i] = this.banks[i].balance;
            }

            // Calculer la somme des actifs externes
            this.computeSumOutsideAssets();

            return this;
        }

        // Fonction utilitaire pour générer des nombres aléatoires binomiaux
        binomialRandom(n, p) {
            let sum = 0;
            for (let i = 0; i < n; i++) {
                if (Math.random() < p) {
                    sum++;
                }
            }
            return sum;
        }
    }

    // Réseau Core-Periphery
    class CorePeripheryNetwork extends Network {
        constructor(nCore, nPeriphery, pCore, pPeriphery) {
            super(nCore + nPeriphery);
            this.nCore = nCore;
            this.nPeriphery = nPeriphery;
            this.pCore = pCore;
            this.pPeriphery = pPeriphery;
        }

        generateNetwork() {
            const n = this.numberOfBanks;

            // Liens core-core (très denses)
            for (let i = 0; i < this.nCore; i++) {
                for (let j = i + 1; j < this.nCore; j++) {
                    if (Math.random() < this.pCore) {
                        if (Math.random() < 0.5) {
                            this.matrixObligation[i][j] = this.binomialRandom(1500, 0.8);
                        } else {
                            this.matrixObligation[j][i] = this.binomialRandom(1500, 0.8);
                        }
                    }
                }
            }

            // Liens core-périphérie (asymétriques)
            for (let i = this.nCore; i < n; i++) {
                for (let j = 0; j < this.nCore; j++) {
                    // Core prête à périphérie (fréquent)
                    if (Math.random() < this.pCore / 2) {
                        this.matrixObligation[j][i] = this.binomialRandom(1000, 0.8);
                    }

                    // Périphérie dépose chez core (moins fréquent)
                    if (Math.random() < this.pPeriphery) {
                        this.matrixObligation[i][j] = this.binomialRandom(500, 0.7);
                    }
                }
            }

            // Liens périphérie-périphérie (très rares)
            for (let i = this.nCore; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (Math.random() < this.pPeriphery / 2) {
                        if (Math.random() < 0.5) {
                            this.matrixObligation[i][j] = this.binomialRandom(200, 0.7);
                        } else {
                            this.matrixObligation[j][i] = this.binomialRandom(200, 0.7);
                        }
                    }
                }
            }

            // Calculer actifs et passifs interbancaires
            const jeDois = this.matrixObligation.map(row => row.reduce((sum, val) => sum + val, 0));
            const onMeDoit = Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    onMeDoit[j] += this.matrixObligation[i][j];
                }
            }

            // Générer actifs et passifs externes
            for (let i = 0; i < n; i++) {
                // Les banques du core ont généralement plus d'actifs externes
                const base = i < this.nCore ? 5000 : 1000;

                // Assurer un bilan positif
                const netInternal = onMeDoit[i] - jeDois[i];
                if (netInternal < 0) {
                    // Si le bilan interne est négatif, ajouter des actifs externes
                    this.vectorOutsideAsset[i] = base + Math.abs(netInternal) * 1.1;
                    this.vectorOutsideLiabilities[i] = base * 0.5;
                } else {
                    // Si le bilan interne est positif, ajouter des passifs externes
                    this.vectorOutsideAsset[i] = base;
                    this.vectorOutsideLiabilities[i] = base * 0.5;
                }
            }

            // Calculer les paiements dus
            this.duePayments = jeDois.map((val, i) => val + this.vectorOutsideLiabilities[i]);

            // Calculer les matrices dérivées
            for (let k = 0; k < n; k++) {
                for (let j = 0; j < n; j++) {
                    if (this.duePayments[k] === 0) {
                        this.matrixRelativeLiabilities[k][j] = 0;
                    } else {
                        this.matrixRelativeLiabilities[k][j] = this.matrixObligation[k][j] / this.duePayments[k];
                    }
                }
            }

            // Créer les objets banques
            for (let i = 0; i < n; i++) {
                this.banks[i] = new Bank(
                    this.vectorOutsideAsset[i],
                    onMeDoit[i],
                    this.vectorOutsideLiabilities[i],
                    jeDois[i]
                );
                this.netWorth[i] = this.banks[i].balance;
            }

            // Calculer la somme des actifs externes
            this.computeSumOutsideAssets();

            return this;
        }

        // Fonction utilitaire pour générer des nombres aléatoires binomiaux
        binomialRandom(n, p) {
            let sum = 0;
            for (let i = 0; i < n; i++) {
                if (Math.random() < p) {
                    sum++;
                }
            }
            return sum;
        }
    }

    // Réseau trivial (toutes les banques reliées entre elles avec des poids identiques)
    class TrivialNetwork extends Network {
        constructor(numberOfBanks) {
            super(numberOfBanks);
        }

        generateNetwork() {
            const n = this.numberOfBanks;

            // Initialiser toutes les obligations à 400, sauf les diagonales (pas d'auto-prêt)
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    this.matrixObligation[i][j] = i === j ? 0 : 400;
                }
            }

            // Matrice des obligations relatives
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    this.matrixRelativeLiabilities[i][j] = i === j ? 0 : 1 / (n - 1);
                }
            }

            // Actifs et passifs externes
            this.vectorOutsideAsset = Array(n).fill(110);
            this.vectorOutsideLiabilities = Array(n).fill(100);
            this.netWorth = Array(n).fill(10);

            // Calculer ce que chaque banque doit et ce qu'on lui doit
            const jeDois = this.matrixObligation.map(row => row.reduce((sum, val) => sum + val, 0));
            const onMeDoit = Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    onMeDoit[j] += this.matrixObligation[i][j];
                }
            }

            // Calculer les paiements dus
            this.duePayments = jeDois.map((val, i) => val + this.vectorOutsideLiabilities[i]);

            // Calculer les vulnérabilités
            for (let k = 0; k < n; k++) {
                if (this.duePayments[k] === 0) {
                    this.vulnerabilities[k] = 0;
                } else {
                    this.vulnerabilities[k] = (this.duePayments[k] - this.vectorOutsideLiabilities[k]) / this.duePayments[k];
                }
            }

            // Normaliser les vulnérabilités
            const sumVulnerabilities = this.vulnerabilities.reduce((sum, val) => sum + val, 0);
            if (sumVulnerabilities > 0) {
                this.vulnerabilities = this.vulnerabilities.map(v => v / sumVulnerabilities);
            }

            // Créer les objets banques
            for (let i = 0; i < n; i++) {
                this.banks[i] = new Bank(
                    this.vectorOutsideAsset[i],
                    onMeDoit[i],
                    this.vectorOutsideLiabilities[i],
                    jeDois[i]
                );
            }

            // Calculer la somme des actifs externes
            this.computeSumOutsideAssets();

            return this;
        }
    }

    // 2. Modèle de contagion (équivalent d'EisenbergNoeModel)

    class EisenbergNoeModel {
        constructor(network) {
            this.network = network;
        }

        applyShock(shockVector) {
            // Vérifier que le choc ne rend pas les actifs négatifs
            for (let i = 0; i < shockVector.length; i++) {
                if (this.network.vectorOutsideAsset[i] - shockVector[i] < 0) {
                    throw new Error("Le vecteur de choc dépasse les actifs externes disponibles");
                }
            }

            // Appliquer le choc
            for (let i = 0; i < shockVector.length; i++) {
                this.network.vectorOutsideAsset[i] -= shockVector[i];
                this.network.banks[i].setOutsideAsset(this.network.vectorOutsideAsset[i]);
                this.network.banks[i].updateBalance();
            }

            // Mettre à jour les vecteurs de défaut
            this.network.defaultVector = this.network.banks.map(bank => bank.isDefault());

            return this.network.defaultVector;
        }

        computeClearingPayments(maxIterations, shockVector) {
            let vectorOfPayments = [...this.network.duePayments];

            // Si aucun choc, retourner les paiements complets
            if (shockVector.every(val => val === 0)) {
                return vectorOfPayments;
            }

            const n = this.network.numberOfBanks;

            while (maxIterations > 0) {
                // Calculer de nouveaux paiements basés sur les paiements actuels
                let newVectorOfPayments = new Array(n);

                for (let i = 0; i < n; i++) {
                    // Calculer la somme des paiements reçus pondérés par les obligations relatives
                    let receivedPayments = 0;
                    for (let j = 0; j < n; j++) {
                        receivedPayments += this.network.matrixRelativeLiabilities[j][i] * vectorOfPayments[j];
                    }

                    // Limite supérieure: paiements dus
                    // Limite inférieure: max(actifs disponibles, 0)
                    newVectorOfPayments[i] = Math.min(
                        this.network.duePayments[i],
                        Math.max(
                            receivedPayments + this.network.vectorOutsideAsset[i] - shockVector[i],
                            0
                        )
                    );
                }

                // Vérifier si on a convergé (avec une tolérance numérique)
                const hasConverged = vectorOfPayments.every((val, i) =>
                    Math.abs(val - newVectorOfPayments[i]) < 0.001
                );

                if (hasConverged) {
                    return newVectorOfPayments;
                }

                // Mettre à jour pour la prochaine itération
                vectorOfPayments = [...newVectorOfPayments];
                maxIterations--;
            }

            // Si on n'a pas convergé, renvoyer la dernière approximation
            return vectorOfPayments;
        }

        measureSystemicImpact(shockVector) {
            // Calculer la mesure du choc (proportion des actifs externes affectés)
            const shockMeasure = shockVector.reduce((sum, val) => sum + val, 0) / this.network.sumOutsideAssets;

            // Compter les défauts
            const defaultCount = this.network.defaultVector.filter(val => val).length;
            const defaultCountProportion = defaultCount / this.network.numberOfBanks;

            // Mesure de vulnérabilité (max des vulnérabilités)
            const vulnerabilitiesMeasure = Math.max(...this.network.vulnerabilities);

            return {
                shockMeasure,
                defaultCountProportion,
                vulnerabilitiesMeasure,
                defaultCount
            };
        }
    }

    // 3. Simulateur (équivalent de Simulation)

    class Simulation {
        constructor(network, shockVector, maxIterations = 100) {
            this.model = new EisenbergNoeModel(network);
            this.shockVector = shockVector;
            this.maxIterations = maxIterations;
            this.steps = [];
            this.finalPayments = null;
        }

        runSimulation() {
            // Initialiser la simulation
            this.model.network.computeSumOutsideAssets();

            // Étape 0: état initial
            this.steps.push({
                step: 0,
                defaultVector: [...this.model.network.defaultVector],
                defaultCount: this.model.network.defaultVector.filter(val => val).length,
                shockMeasure: 0
            });

            // Appliquer le choc initial
            this.model.applyShock(this.shockVector);

            // Étape 1: après le choc initial
            this.steps.push({
                step: 1,
                defaultVector: [...this.model.network.defaultVector],
                defaultCount: this.model.network.defaultVector.filter(val => val).length,
                shockMeasure: this.shockVector.reduce((sum, val) => sum + val, 0) / this.model.network.sumOutsideAssets
            });

            // Si des banques sont en défaut, calculer les paiements d'équilibre
            if (this.model.network.defaultVector.some(val => val)) {
                this.finalPayments = this.model.computeClearingPayments(this.maxIterations, this.shockVector);

                // Mettre à jour les bilans des banques après les paiements d'équilibre
                for (let i = 0; i < this.model.network.numberOfBanks; i++) {
                    this.model.network.banks[i].setOutsideAsset(this.model.network.vectorOutsideAsset[i]);
                    this.model.network.banks[i].updateBalance();
                }

                // Mettre à jour les valeurs nettes des banques
                const tempNetWorth = this.model.network.banks.map(bank => bank.balance);
                this.model.network.netWorth = tempNetWorth;

                // Mettre à jour les vecteurs de défaut
                this.model.network.updateDefaults();

                // Étape 2: après la contagion
                this.steps.push({
                    step: 2,
                    defaultVector: [...this.model.network.defaultVector],
                    defaultCount: this.model.network.defaultVector.filter(val => val).length,
                    shockMeasure: this.shockVector.reduce((sum, val) => sum + val, 0) / this.model.network.sumOutsideAssets
                });
            }

            // Mesurer l'impact systémique
            const impact = this.model.measureSystemicImpact(this.shockVector);

            return {
                finalPayments: this.finalPayments,
                shockMeasure: impact.shockMeasure,
                defaultCount: impact.defaultCount,
                defaultCountProportion: impact.defaultCountProportion,
                vulnerabilitiesMeasure: impact.vulnerabilitiesMeasure,
                steps: this.steps
            };
        }
    }

    // Fonction pour générer un réseau basé sur le type et les paramètres sélectionnés
    const generateNetwork = () => {
        let simulatedNetwork;

        switch (networkType) {
            case 'random':
                const { nodes, connections } = networkParams.random;
                simulatedNetwork = new RandomNetwork(nodes, connections);
                break;
            case 'corePeriphery':
                const { coreNodes, peripheryNodes, coreConnections, peripheryConnections } = networkParams.corePeriphery;
                simulatedNetwork = new CorePeripheryNetwork(coreNodes, peripheryNodes, coreConnections, peripheryConnections);
                break;
            case 'trivial':
                simulatedNetwork = new TrivialNetwork(networkParams.trivial.nodes);
                break;
            default:
                simulatedNetwork = new RandomNetwork(10, 0.2);
        }

        simulatedNetwork.generateNetwork();

        // Convertir pour la visualisation D3
        const nodes = simulatedNetwork.banks.map((bank, i) => ({
            id: i,
            name: `Banque ${i + 1}`,
            assets: bank.outsideAsset + bank.asset,
            liabilities: bank.outsideLiabilities + bank.liabilities,
            netWorth: bank.balance,
            defaulted: bank.isDefault(),
            x: Math.random() * 600,
            y: Math.random() * 400,
            type: networkType === 'corePeriphery' && i < networkParams.corePeriphery.coreNodes ? 'core' : 'periphery'
        }));

        const links = [];
        for (let i = 0; i < simulatedNetwork.numberOfBanks; i++) {
            for (let j = 0; j < simulatedNetwork.numberOfBanks; j++) {
                if (simulatedNetwork.matrixObligation[i][j] > 0) {
                    links.push({
                        source: i,
                        target: j,
                        value: simulatedNetwork.matrixObligation[i][j]
                    });
                }
            }
        }

        setNetwork({ simulatedNetwork, nodes, links });
    };

    // Fonction pour simuler la contagion financière
    const runContagionSimulation = () => {
        setIsSimulating(true);
        setSimulationProgress(0);

        // Créer un vecteur de choc basé sur les paramètres
        const { shockMagnitude, shockType, targetType } = simulationParams;
        const shockVector = Array(network.simulatedNetwork.numberOfBanks).fill(0);

        // Appliquer différents types de chocs
        if (shockType === 'uniform') {
            // Choc uniforme sur tous les actifs
            for (let i = 0; i < shockVector.length; i++) {
                shockVector[i] = network.simulatedNetwork.vectorOutsideAsset[i] * shockMagnitude;
            }
        } else if (shockType === 'targeted') {
            if (targetType === 'all') {
                // Choc ciblé sur une banque aléatoire
                const targetIndex = Math.floor(Math.random() * shockVector.length);
                shockVector[targetIndex] = network.simulatedNetwork.vectorOutsideAsset[targetIndex] * shockMagnitude;
            } else if (targetType === 'core' && networkType === 'corePeriphery') {
                // Choc ciblé sur les banques du core
                const coreSize = networkParams.corePeriphery.coreNodes;
                for (let i = 0; i < coreSize; i++) {
                    shockVector[i] = network.simulatedNetwork.vectorOutsideAsset[i] * shockMagnitude;
                }
            } else if (targetType === 'periphery' && networkType === 'corePeriphery') {
                // Choc ciblé sur les banques de la périphérie
                const coreSize = networkParams.corePeriphery.coreNodes;
                for (let i = coreSize; i < shockVector.length; i++) {
                    shockVector[i] = network.simulatedNetwork.vectorOutsideAsset[i] * shockMagnitude;
                }
            }
        }

        // Exécuter la simulation
        setTimeout(() => {
            try {
                const simulator = new Simulation(
                    network.simulatedNetwork,
                    shockVector,
                    simulationParams.maxIterations
                );

                const results = simulator.runSimulation();

                // Mettre à jour le réseau pour la visualisation
                const updatedNodes = network.nodes.map((node, i) => ({
                    ...node,
                    defaulted: results.steps[results.steps.length - 1].defaultVector[i]
                }));

                setNetwork(prev => ({
                    ...prev,
                    nodes: updatedNodes
                }));

                setSimulationSteps(results.steps);
                setSimulationResults(results);
                setIsSimulating(false);
                setSimulationProgress(100);
            } catch (error) {
                console.error("Erreur lors de la simulation:", error);
                setIsSimulating(false);
            }
        }, 1000);
    };

    // Fonction pour exécuter une série de simulations avec des magnitudes de choc croissantes
    const runShockSeriesSimulation = () => {
        setIsSimulating(true);
        setSimulationProgress(0);

        const shockSeries = Array.from({ length: 11 }, (_, i) => i / 10); // [0, 0.1, 0.2, ..., 1.0]
        const results = [];

        // Fonction pour exécuter une simulation avec un niveau de choc donné
        const simulateWithShockLevel = (index) => {
            if (index >= shockSeries.length) {
                // Toutes les simulations sont terminées
                const seriesResults = {
                    shockMeasures: results.map(r => r.shockMeasure),
                    defaultCounts: results.map(r => r.defaultCountProportion)
                };

                setSimulationResults(prev => ({
                    ...prev,
                    series: seriesResults
                }));

                setIsSimulating(false);
                setSimulationProgress(100);
                return;
            }

            // Mettre à jour la progression
            setSimulationProgress(Math.round((index / shockSeries.length) * 100));

            // Créer un vecteur de choc basé sur le niveau actuel
            const shockMagnitude = shockSeries[index];
            const shockVector = Array(network.simulatedNetwork.numberOfBanks).fill(0);

            for (let i = 0; i < shockVector.length; i++) {
                shockVector[i] = network.simulatedNetwork.vectorOutsideAsset[i] * shockMagnitude;
            }

            // Cloner le réseau pour chaque simulation
            const clonedNetwork = JSON.parse(JSON.stringify(network.simulatedNetwork));

            // Exécuter la simulation
            const simulator = new Simulation(
                clonedNetwork,
                shockVector,
                simulationParams.maxIterations
            );

            const result = simulator.runSimulation();
            results.push({
                shockMagnitude,
                shockMeasure: result.shockMeasure,
                defaultCountProportion: result.defaultCountProportion
            });

            // Passer à la prochaine simulation
            setTimeout(() => simulateWithShockLevel(index + 1), 100);
        };

        // Commencer les simulations
        simulateWithShockLevel(0);
    };

    // Initialiser le réseau au chargement du composant
    useEffect(() => {
        generateNetwork();
    }, []);

    // Mettre à jour la visualisation du réseau quand il change
    useEffect(() => {
        if (networkRef.current && network.nodes.length > 0) {
            renderNetworkVisualization();
        }
    }, [network]);

    // Mettre à jour la visualisation du graphique quand les résultats changent
    useEffect(() => {
        if (chartRef.current && simulationResults && simulationResults.series) {
            renderShockSeriesChart();
        }
    }, [simulationResults]);

    // Fonction pour rendre la visualisation du réseau avec D3
    const renderNetworkVisualization = () => {
        const svg = d3.select(networkRef.current);
        svg.selectAll("*").remove();

        const width = svg.attr("width");
        const height = svg.attr("height");
        const nodeRadius = 12;

        // Créer un groupe pour les éléments
        const g = svg.append("g");

        // Créer tooltip
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

        // Ajouter comportement de zoom
        const zoom = d3.zoom()
            .scaleExtent([0.5, 5])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        // Préparer les données pour D3
        const nodes = network.nodes.map(node => ({...node}));
        const links = network.links.map(link => ({
            source: nodes[link.source],
            target: nodes[link.target],
            value: link.value
        }));

        // Créer la simulation de force
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(80))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(nodeRadius * 1.5));

        // Créer les liens
        const link = g.selectAll(".link")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke", "#aaa")
            .attr("stroke-width", d => Math.sqrt(d.value) / 10)
            .attr("stroke-opacity", 0.6);

        // Créer les groupes de nœuds
        const node = g.selectAll(".node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // Ajouter des cercles aux nœuds
        node.append("circle")
            .attr("r", d => networkType === 'corePeriphery' && d.type === 'core' ? nodeRadius * 1.5 : nodeRadius)
            .attr("fill", d => {
                if (d.defaulted) return "rgba(255, 50, 50, 0.8)";
                if (networkType === 'corePeriphery' && d.type === 'core') return "rgba(50, 150, 255, 0.8)";
                return "rgba(100, 200, 100, 0.8)";
            })
            .attr("stroke", d => {
                if (d.defaulted) return "rgba(200, 0, 0, 0.8)";
                if (networkType === 'corePeriphery' && d.type === 'core') return "rgba(0, 100, 200, 0.8)";
                return "rgba(0, 150, 0, 0.8)";
            })
            .attr("stroke-width", 2)
            .on("mouseover", function(event, d) {
                d3.select(this).attr("r",
                    networkType === 'corePeriphery' && d.type === 'core' ? nodeRadius * 1.8 : nodeRadius * 1.2
                );
                tooltip
                    .style("visibility", "visible")
                    .html(`
            <strong>${d.name}</strong><br/>
            Actifs: ${d.assets.toFixed(2)}<br/>
            Dettes: ${d.liabilities.toFixed(2)}<br/>
            Valeur nette: ${(d.assets - d.liabilities).toFixed(2)}<br/>
            ${d.defaulted ? "<span style='color:red'>En défaut</span>" : "<span style='color:green'>Stable</span>"}
            ${networkType === 'corePeriphery' ? `<br/>Type: ${d.type === 'core' ? "Core" : "Périphérie"}` : ""}
          `);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function(d) {
                d3.select(this).attr("r",
                    networkType === 'corePeriphery' && d.type === 'core' ? nodeRadius * 1.5 : nodeRadius
                );
                tooltip.style("visibility", "hidden");
            });

        // Ajouter étiquettes de texte
        node.append("text")
            .attr("dy", -nodeRadius - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .text(d => d.name);

        // Fonctions de glisser-déposer
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

        // Mettre à jour les positions à chaque tick
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

        // Fonction de nettoyage
        return () => {
            tooltip.remove();
            simulation.stop();
        };
    };

    // Fonction pour rendre le graphique des séries de chocs
    const renderShockSeriesChart = () => {
        const svg = d3.select(chartRef.current);
        svg.selectAll("*").remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const width = +svg.attr("width") - margin.left - margin.right;
        const height = +svg.attr("height") - margin.top - margin.bottom;

        // Créer un groupe avec les marges
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Échelles X et Y
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);

        // Ajouter les axes
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(10).tickFormat(d => `${d * 100}%`));

        g.append("g")
            .call(d3.axisLeft(y).ticks(10).tickFormat(d => `${d * 100}%`));

        // Ajouter les étiquettes des axes
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .text("Magnitude du choc (% des actifs externes)");

        g.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${-margin.left + 15},${height/2}) rotate(-90)`)
            .text("Proportion de banques en défaut");

        // Données pour le graphique
        const data = simulationResults.series.shockMeasures.map((measure, i) => ({
            x: measure,
            y: simulationResults.series.defaultCounts[i]
        }));

        // Ligne pour la courbe de défauts
        const line = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y))
            .curve(d3.curveMonotoneX);

        // Ajouter la ligne
        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "rgba(108, 99, 255, 1)")
            .attr("stroke-width", 2)
            .attr("d", line);

        // Ajouter les points
        g.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.x))
            .attr("cy", d => y(d.y))
            .attr("r", 4)
            .attr("fill", "rgba(108, 99, 255, 0.7)");

        // Déterminer s'il y a un point d'inflexion
        let inflectionPoint = null;
        for (let i = 1; i < data.length - 1; i++) {
            // Calculer les dérivées approximatives
            const slope1 = (data[i].y - data[i-1].y) / (data[i].x - data[i-1].x);
            const slope2 = (data[i+1].y - data[i].y) / (data[i+1].x - data[i].x);

            // Si le changement de pente est significatif, marquer comme point d'inflexion
            if (slope1 < slope2 && data[i].y > 0.1) {
                inflectionPoint = data[i];
                break;
            }
        }

        // Ajouter une ligne verticale au point d'inflexion s'il existe
        if (inflectionPoint) {
            g.append("line")
                .attr("x1", x(inflectionPoint.x))
                .attr("y1", height)
                .attr("x2", x(inflectionPoint.x))
                .attr("y2", 0)
                .attr("stroke", "red")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "4");

            g.append("text")
                .attr("x", x(inflectionPoint.x) + 5)
                .attr("y", 15)
                .attr("fill", "red")
                .text(`Seuil critique: ${(inflectionPoint.x * 100).toFixed(1)}%`);
        }
    };

    // Fonction pour obtenir le texte d'analyse basé sur les résultats
    const getAnalysisText = () => {
        if (!simulationResults || !simulationResults.series) return "";

        const data = simulationResults.series.shockMeasures.map((measure, i) => ({
            x: measure,
            y: simulationResults.series.defaultCounts[i]
        }));

        // Déterminer le comportement de la courbe
        let isConvexAtBeginning = true;
        let isConcaveAtEnd = false;
        let hasCriticalThreshold = false;
        let thresholdValue = 0;

        for (let i = 1; i < data.length - 1; i++) {
            // Calculer les dérivées approximatives
            const slope1 = (data[i].y - data[i-1].y) / (data[i].x - data[i-1].x);
            const slope2 = (data[i+1].y - data[i].y) / (data[i+1].x - data[i].x);

            if (i < data.length / 2 && slope1 > slope2) {
                isConvexAtBeginning = false;
            }

            if (i > data.length / 2 && slope1 < slope2) {
                isConcaveAtEnd = true;
            }

            // Si le changement de pente est significatif, marquer comme point d'inflexion
            if (slope1 < slope2 && data[i].y > 0.1 && !hasCriticalThreshold) {
                hasCriticalThreshold = true;
                thresholdValue = data[i].x;
            }
        }

        // Analyser le comportement du réseau
        let analysis = "";

        switch (networkType) {
            case 'random':
                analysis = `Cette simulation montre le comportement d'un réseau financier aléatoire avec une densité de connexions de ${networkParams.random.connections}.
        
${isConvexAtBeginning ?
                    "Au début de la courbe, nous observons un comportement convexe, ce qui suggère que le réseau résiste initialement bien aux chocs grâce à la diversification des risques." :
                    "La courbe ne montre pas de comportement convexe initial, ce qui suggère que même des chocs légers peuvent rapidement provoquer des défauts dans ce réseau."}

${hasCriticalThreshold ?
                    `Un seuil critique apparaît autour de ${(thresholdValue * 100).toFixed(1)}% de la valeur des actifs externes. Au-delà de ce seuil, le réseau passe d'un régime de résistance à un régime d'amplification des chocs.` :
                    "Aucun seuil critique clair n'a été identifié, ce qui suggère une progression régulière des défauts à mesure que l'intensité du choc augmente."}

${isConcaveAtEnd ?
                    "Vers la fin de la courbe, le comportement devient concave, indiquant une accélération des défauts par effet d'amplification: chaque défaut supplémentaire provoque rapidement de nouveaux défauts." :
                    "Même avec des chocs importants, le réseau maintient une progression linéaire des défauts, sans effet d'avalanche notable."}

${networkParams.random.connections > 0.3 ?
                    "La densité élevée des connexions dans ce réseau semble initialement offrir une protection par diversification, mais finit par devenir un vecteur de contagion lors de chocs sévères." :
                    "La faible densité des connexions limite la propagation des défauts, mais offre aussi moins d'opportunités de diversification des risques."}`;
                break;

            case 'corePeriphery':
                analysis = `Cette simulation montre le comportement d'un réseau Core-Periphery avec ${networkParams.corePeriphery.coreNodes} banques au cœur et ${networkParams.corePeriphery.peripheryNodes} en périphérie.
        
Ce type de réseau est particulièrement pertinent car il reflète la structure observée dans les systèmes bancaires réels, où un petit nombre de grandes institutions très interconnectées (le "core") transactionnent avec de nombreuses institutions plus petites en périphérie.

${simulationParams.shockType === 'targeted' && simulationParams.targetType === 'core' ?
                    "Le choc ciblé sur les banques du cœur révèle la vulnérabilité systémique de ce type de réseau. Quand les institutions centrales sont affectées, l'effet de contagion se propage rapidement à la périphérie." :
                    simulationParams.shockType === 'targeted' && simulationParams.targetType === 'periphery' ?
                        "Le choc ciblé sur les banques périphériques montre que ces défaillances ont généralement un impact limité sur l'ensemble du système, à moins que le choc ne soit particulièrement sévère." :
                        "Le choc uniforme permet d'observer comment la structure core-periphery réagit globalement aux perturbations."}

${hasCriticalThreshold ?
                    `Un seuil critique apparaît autour de ${(thresholdValue * 100).toFixed(1)}% de la valeur des actifs. Au-delà de ce seuil, l'effet de contagion s'accélère considérablement.` :
                    "La progression des défauts semble relativement régulière sans seuil critique évident, ce qui pourrait indiquer une bonne isolation entre le cœur et la périphérie."}

Les institutions du cœur, en raison de leur forte interconnexion, peuvent soit amplifier les chocs (en cas de défaut) soit les absorber (grâce à leur diversification). Cette dualité est caractéristique des réseaux Core-Periphery.`;
                break;

            case 'trivial':
                analysis = `Cette simulation montre le comportement d'un réseau trivial où toutes les banques sont identiquement connectées avec des poids égaux.
        
Ce réseau symétrique et homogène sert de cas de référence théorique pour comprendre les dynamiques de contagion dans des conditions idéalisées.

${hasCriticalThreshold ?
                    `Un seuil critique net apparaît à ${(thresholdValue * 100).toFixed(1)}% de choc. En raison de l'homogénéité du réseau, une fois ce seuil dépassé, presque toutes les banques font défaut simultanément.` :
                    "De façon surprenante, même ce réseau homogène ne présente pas de seuil critique évident, ce qui pourrait indiquer que d'autres facteurs comme la taille des bilans jouent un rôle important."}

Dans ce type de réseau, on s'attend généralement à observer un effet de "tout ou rien" en raison de l'identité structurelle des nœuds. Quand une banque fait défaut, les autres ont tendance à suivre rapidement.`;
                break;

            default:
                analysis = "L'analyse des résultats de simulation sera affichée ici.";
        }

        return analysis;
    };

    // Interface utilisateur
    return (
        <div className="financial-network-container">
            <div className="tabs">
                <button
                    className={activeTab === 'setup' ? 'active' : ''}
                    onClick={() => setActiveTab('setup')}
                >
                    Configuration
                </button>
                <button
                    className={activeTab === 'visualization' ? 'active' : ''}
                    onClick={() => setActiveTab('visualization')}
                >
                    Visualisation
                </button>
                <button
                    className={activeTab === 'results' ? 'active' : ''}
                    onClick={() => setActiveTab('results')}
                >
                    Résultats
                </button>
            </div>

            {activeTab === 'setup' && (
                <div className="setup-panel">
                    <h2>Configuration du réseau</h2>
                    <div className="form-group">
                        <label>Type de réseau:</label>
                        <select
                            value={networkType}
                            onChange={(e) => setNetworkType(e.target.value)}
                        >
                            <option value="random">Réseau aléatoire (Erdős–Rényi)</option>
                            <option value="corePeriphery">Réseau Core-Periphery</option>
                            <option value="trivial">Réseau trivial (homogène)</option>
                        </select>
                    </div>

                    {networkType === 'random' && (
                        <div className="network-params">
                            <h3>Paramètres du réseau aléatoire</h3>
                            <div className="form-group">
                                <label>Nombre de banques:</label>
                                <input
                                    type="range"
                                    min="5"
                                    max="50"
                                    value={networkParams.random.nodes}
                                    onChange={(e) => setNetworkParams({
                                        ...networkParams,
                                        random: {
                                            ...networkParams.random,
                                            nodes: parseInt(e.target.value)
                                        }
                                    })}
                                />
                                <span>{networkParams.random.nodes}</span>
                            </div>
                            <div className="form-group">
                                <label>Densité des connexions:</label>
                                <input
                                    type="range"
                                    min="0.05"
                                    max="0.5"
                                    step="0.05"
                                    value={networkParams.random.connections}
                                    onChange={(e) => setNetworkParams({
                                        ...networkParams,
                                        random: {
                                            ...networkParams.random,
                                            connections: parseFloat(e.target.value)
                                        }
                                    })}
                                />
                                <span>{(networkParams.random.connections * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    )}

                    {networkType === 'corePeriphery' && (
                        <div className="network-params">
                            <h3>Paramètres du réseau Core-Periphery</h3>
                            <div className="form-group">
                                <label>Nombre de banques du cœur:</label>
                                <input
                                    type="range"
                                    min="2"
                                    max="15"
                                    value={networkParams.corePeriphery.coreNodes}
                                    onChange={(e) => setNetworkParams({
                                        ...networkParams,
                                        corePeriphery: {
                                            ...networkParams.corePeriphery,
                                            coreNodes: parseInt(e.target.value)
                                        }
                                    })}
                                />
                                <span>{networkParams.corePeriphery.coreNodes}</span>
                            </div>
                            <div className="form-group">
                                <label>Nombre de banques périphériques:</label>
                                <input
                                    type="range"
                                    min="5"
                                    max="35"
                                    value={networkParams.corePeriphery.peripheryNodes}
                                    onChange={(e) => setNetworkParams({
                                        ...networkParams,
                                        corePeriphery: {
                                            ...networkParams.corePeriphery,
                                            peripheryNodes: parseInt(e.target.value)
                                        }
                                    })}
                                />
                                <span>{networkParams.corePeriphery.peripheryNodes}</span>
                            </div>
                            <div className="form-group">
                                <label>Densité des connexions du cœur:</label>
                                <input
                                    type="range"
                                    min="0.2"
                                    max="0.9"
                                    step="0.05"
                                    value={networkParams.corePeriphery.coreConnections}
                                    onChange={(e) => setNetworkParams({
                                        ...networkParams,
                                        corePeriphery: {
                                            ...networkParams.corePeriphery,
                                            coreConnections: parseFloat(e.target.value)
                                        }
                                    })}
                                />
                                <span>{(networkParams.corePeriphery.coreConnections * 100).toFixed(0)}%</span>
                            </div>
                            <div className="form-group">
                                <label>Densité des connexions périphériques:</label>
                                <input
                                    type="range"
                                    min="0.05"
                                    max="0.5"
                                    step="0.05"
                                    value={networkParams.corePeriphery.peripheryConnections}
                                    onChange={(e) => setNetworkParams({
                                        ...networkParams,
                                        corePeriphery: {
                                            ...networkParams.corePeriphery,
                                            peripheryConnections: parseFloat(e.target.value)
                                        }
                                    })}
                                />
                                <span>{(networkParams.corePeriphery.peripheryConnections * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    )}

                    {networkType === 'trivial' && (
                        <div className="network-params">
                            <h3>Paramètres du réseau trivial</h3>
                            <div className="form-group">
                                <label>Nombre de banques:</label>
                                <input
                                    type="range"
                                    min="5"
                                    max="30"
                                    value={networkParams.trivial.nodes}
                                    onChange={(e) => setNetworkParams({
                                        ...networkParams,
                                        trivial: {
                                            ...networkParams.trivial,
                                            nodes: parseInt(e.target.value)
                                        }
                                    })}
                                />
                                <span>{networkParams.trivial.nodes}</span>
                            </div>
                        </div>
                    )}

                    <h2>Paramètres de simulation</h2>
                    <div className="form-group">
                        <label>Type de choc:</label>
                        <select
                            value={simulationParams.shockType}
                            onChange={(e) => setSimulationParams({
                                ...simulationParams,
                                shockType: e.target.value
                            })}
                        >
                            <option value="uniform">Choc uniforme (toutes les banques)</option>
                            <option value="targeted">Choc ciblé</option>
                        </select>
                    </div>

                    {simulationParams.shockType === 'targeted' && (
                        <div className="form-group">
                            <label>Cible du choc:</label>
                            <select
                                value={simulationParams.targetType}
                                onChange={(e) => setSimulationParams({
                                    ...simulationParams,
                                    targetType: e.target.value
                                })}
                            >
                                <option value="all">Banque aléatoire</option>
                                {networkType === 'corePeriphery' && (
                                    <>
                                        <option value="core">Banques du cœur</option>
                                        <option value="periphery">Banques périphériques</option>
                                    </>
                                )}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Magnitude du choc:</label>
                        <input
                            type="range"
                            min="0.1"
                            max="0.9"
                            step="0.1"
                            value={simulationParams.shockMagnitude}
                            onChange={(e) => setSimulationParams({
                                ...simulationParams,
                                shockMagnitude: parseFloat(e.target.value)
                            })}
                        />
                        <span>{(simulationParams.shockMagnitude * 100).toFixed(0)}%</span>
                    </div>

                    <div className="form-group">
                        <label>Nombre maximum d'itérations:</label>
                        <input
                            type="range"
                            min="5"
                            max="20"
                            value={simulationParams.maxIterations}
                            onChange={(e) => setSimulationParams({
                                ...simulationParams,
                                maxIterations: parseInt(e.target.value)
                            })}
                        />
                        <span>{simulationParams.maxIterations}</span>
                    </div>

                    <div className="button-group">
                        <button
                            onClick={generateNetwork}
                            className="btn primary"
                        >
                            Générer le réseau
                        </button>
                        <button
                            onClick={runContagionSimulation}
                            className="btn secondary"
                            disabled={isSimulating}
                        >
                            {isSimulating ? 'Simulation en cours...' : 'Simuler un choc unique'}
                        </button>
                        <button
                            onClick={runShockSeriesSimulation}
                            className="btn secondary"
                            disabled={isSimulating}
                        >
                            {isSimulating ? 'Simulation en cours...' : 'Simuler série de chocs'}
                        </button>
                    </div>

                    {isSimulating && (
                        <div className="progress-bar">
                            <div
                                className="progress"
                                style={{ width: `${simulationProgress}%` }}
                            ></div>
                            <span>{simulationProgress}%</span>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'visualization' && (
                <div className="visualization-panel">
                    <h2>Visualisation du réseau</h2>
                    <div className="network-legend">
                        <div>
                            <span className="legend-dot default"></span> Banques en défaut
                        </div>
                        {networkType === 'corePeriphery' ? (
                            <>
                                <div>
                                    <span className="legend-dot core"></span> Banques du cœur
                                </div>
                                <div>
                                    <span className="legend-dot periphery"></span> Banques périphériques
                                </div>
                            </>
                        ) : (
                            <div>
                                <span className="legend-dot stable"></span> Banques stables
                            </div>
                        )}
                    </div>

                    <div className="network-container">
                        <svg
                            ref={networkRef}
                            width="800"
                            height="500"
                            className="network-svg"
                        ></svg>
                        <div className="zoom-hint">
                            Utilisez la molette pour zoomer et cliquez-glissez pour déplacer les nœuds
                        </div>
                    </div>

                    {simulationSteps.length > 0 && (
                        <div className="simulation-steps">
                            <h3>Étapes de contagion</h3>
                            <div className="steps-container">
                                {simulationSteps.map((step, index) => (
                                    <div key={index} className="step-card">
                                        <h4>Étape {step.step}</h4>
                                        <p>Banques en défaut: {step.defaultCount} / {network.nodes.length}</p>
                                        <p>Magnitude du choc: {(step.shockMeasure * 100).toFixed(1)}%</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'results' && (
                <div className="results-panel">
                    <h2>Résultats de la simulation</h2>

                    {simulationResults && simulationResults.series ? (
                        <>
                            <div className="chart-container">
                                <h3>Courbe de défaut en fonction du choc</h3>
                                <svg
                                    ref={chartRef}
                                    width="600"
                                    height="400"
                                    className="chart-svg"
                                ></svg>
                            </div>

                            <div className="analysis-container">
                                <h3>Analyse des résultats</h3>
                                <p className="analysis-text">
                                    {getAnalysisText()}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="no-results">
                            <p>Exécutez une simulation pour voir les résultats.</p>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
        .financial-network-container {
          font-family: 'Inter', sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .tabs button {
          padding: 10px 20px;
          border: none;
          background: none;
          color: #666;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s;
        }
        
        .tabs button.active {
          color: #6C63FF;
          border-bottom: 2px solid #6C63FF;
        }
        
        h2 {
          color: #333;
          margin-bottom: 20px;
        }
        
        h3 {
          color: #555;
          margin-bottom: 15px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        select, input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 5px;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        .btn {
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.3s;
        }
        
        .btn.primary {
          background: #6C63FF;
          color: white;
        }
        
        .btn.secondary {
          background: #f0f0f0;
          color: #333;
        }
        
        .btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .progress-bar {
          margin-top: 20px;
          height: 20px;
          background: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }
        
        .progress {
          height: 100%;
          background: #6C63FF;
          transition: width 0.3s;
        }
        
        .progress-bar span {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          text-align: center;
          line-height: 20px;
          color: white;
          font-size: 12px;
          font-weight: bold;
          text-shadow: 0 0 2px rgba(0,0,0,0.5);
        }
        
        .network-container {
          position: relative;
          margin-bottom: 20px;
        }
        
        .network-svg {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background-color: #f8f8ff;
          width: 100%;
          height: 500px;
        }
        
        .zoom-hint {
          text-align: center;
          font-size: 12px;
          color: #777;
          margin-top: 5px;
        }
        
        .network-legend {
          display: flex;
          gap: 20px;
          margin-bottom: 10px;
        }
        
        .legend-dot {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 5px;
        }
        
        .legend-dot.default {
          background-color: rgba(255, 50, 50, 0.8);
        }
        
        .legend-dot.stable {
          background-color: rgba(100, 200, 100, 0.8);
        }
        
        .legend-dot.core {
          background-color: rgba(50, 150, 255, 0.8);
        }
        
        .legend-dot.periphery {
          background-color: rgba(100, 200, 100, 0.8);
        }
        
        .simulation-steps {
          margin-top: 30px;
        }
        
        .steps-container {
          display: flex;
          gap: 15px;
          overflow-x: auto;
          padding-bottom: 10px;
        }
        
        .step-card {
          min-width: 200px;
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background-color: white;
        }
        
        .step-card h4 {
          margin-top: 0;
          color: #6C63FF;
        }
        
        .chart-container {
          margin-bottom: 30px;
        }
        
        .chart-svg {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background-color: white;
          width: 100%;
          height: 400px;
        }
        
        .analysis-container {
          padding: 20px;
          background-color: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        
        .analysis-text {
          line-height: 1.6;
          white-space: pre-line;
        }
        
        .no-results {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
          background-color: #f9f9f9;
          border-radius: 8px;
          color: #777;
        }
      `}</style>
        </div>
    );
};

export default FinancialNetworkModel;