import { CompositeGoal, LeafGoal } from "../goals/goals";
import { QualityModel } from "./quality-model";

/**
 * Represents the ISO/IEC 25010 quality model.
 * This model defines characteristics and sub-characteristics for evaluating software quality.
 */
export class ISOIEC25010 extends QualityModel {
    constructor() {
        /* Quality Model Metadata */
        super('ISO/IEC 25010 - Product Quality Model', '2023', [],
            'The ISO/IEC 25010 (2023) identifies eight main quality characteristics of software systems, each divided into sub-characteristics. These are Interaction Capability, Functional Suitability, Performance Efficiency, Compatibility, Reliability, Security, Flexibility, and Safety. Each of these characteristics and their sub-characteristics is crucial in assessing and ensuring the overall quality of software systems and products. They provide a comprehensive framework for understanding various dimensions of software quality from the product perspective. This detailed framework is invaluable for software developers, quality assurance professionals, and evaluators in creating, assessing, and ensuring high-quality software products',
            'https://www.iso.org/obp/ui/#iso:std:iso-iec:25010:ed-2:v1:en');

        /* Build the quality model (sub-)characteristics */
        this.buildCharacteristics();
    }

    /**
     * Clears and rebuilds all characteristics of the ISO/IEC 25010 quality model.
     */
    public rebuild() {
        this.clearGoals();
        this.buildCharacteristics();
    }

    /**
     * Builds all main characteristics and their sub-characteristics for the model.
     */
    private buildCharacteristics() {
        this.buildInteractionCapabilityCharacteristics(); // Interaction Capability
        this.buildFunctionalSuitabilityCharacteristics(); // Functional Suitability
        this.buildPerformanceEfficiencyCharacteristics(); // Performance Efficiency
        this.buildCompatibilityCharacteristics(); // Compatibility
        this.buildReliabilityCharacteristics(); // Reliability
        this.buildSecurityCharacteristics(); // Security
        this.buildFlexibilityCharacteristics(); // Flexibility
        this.buildSafetyCharacteristics(); // Safety
        this.buildEnergyConsumptionCharacteristics() // Energy consumption
    }

    /**
     * Builds the Interaction Capability characteristic and its sub-characteristics:
     * Appropriateness Recognizability, Learnability, Operability, User Error Protection,
     * User Engagement, Inclusivity, User Assistance, and Self-Descriptiveness
     */
    private buildInteractionCapabilityCharacteristics() {
        /* Interaction Capability */
        const interactionCapability = new CompositeGoal('Interaction Capability', 'The ability of a product to be interacted with by specified users to exchange information between a user and a system via the user interface to complete the intended task', undefined, 1);
        this.addGoal(interactionCapability);

        /* Appropriateness Recognizability */
        const appropriatenessRecognizability = new LeafGoal('Appropriateness Recognizability', 'The degree to which users can recognize whether the software is appropriate for their needs', undefined, 1);
        this.addSubGoal(appropriatenessRecognizability, interactionCapability);

        /* Learnability */
        const learnability = new LeafGoal('Learnability', 'The degree to which the software can be learned by users', undefined, 1);
        this.addSubGoal(learnability, interactionCapability);

        /* Operability */
        const operability = new LeafGoal('Operability', 'The degree to which the software is user-friendly and controllable', undefined, 1);
        this.addSubGoal(operability, interactionCapability);

        /* User Error Protection */
        const userErrorProtection = new LeafGoal('User Error Protection', 'The degree to which the software is user-friendly and controllable', undefined, 1);
        this.addSubGoal(userErrorProtection, interactionCapability);

        /* User Engagement */
        this.buildUserEngagementCharacteristics(interactionCapability);

        /* Inclusivity */
        const inclusivity = new LeafGoal('Inclusivity', 'The degree to which the software can be utilized by people of various backgrounds', undefined, 1);
        this.addSubGoal(inclusivity, interactionCapability);

        /* User Assistance */
        const userAssistance = new LeafGoal('User Assistance', 'The degree to which a software can be used by people with the widest range of characteristics and capabilities to achieve specified goals in a specified context of use', undefined, 1);
        this.addSubGoal(userAssistance, interactionCapability);

        /* Self-Descriptiveness */
        const selfDescriptiveness = new LeafGoal('Self-Descriptiveness', 'The degree to which a software can present appropriate information, where needed by the user, to make its capabilities and use immediately obvious to the user without excessive interactions with a product or other resources', undefined, 1);
        this.addSubGoal(selfDescriptiveness, interactionCapability);
    }

    private buildUserEngagementCharacteristics(interactionCapability: CompositeGoal) {
        const userEngagement = new CompositeGoal('User Engagement', 'The degree to which the software presents functions and information in an inviting and motivating manner encouraging continued interaction', undefined, 1);

        /* Popularity */
        const popularity = new LeafGoal('Popularity', 'The degreee to which the software is popular among its users', undefined, 1);
        this.addSubGoal(popularity, userEngagement);

        /* Activity */
        const activity = new LeafGoal('Activity', 'The degree to which users are actively engaged with the software', undefined, 1);
        this.addSubGoal(activity, userEngagement);

        /* Loyalty */
        const loyalty = new LeafGoal('Loyalty', 'The degree to which users are loyal to the software', undefined, 1);
        this.addSubGoal(loyalty, userEngagement);

        /* Add User Engagement as a sub-goal to Interaction Capability */
        this.addSubGoal(userEngagement, interactionCapability);
    }

    /**
     * Builds the Functional Suitability characteristic and its sub-characteristics:
     * Functional Completeness, Functional Correctness, and Functional Appropriateness
     */
    private buildFunctionalSuitabilityCharacteristics() {
        /* Functional Suitability */
        const functionalSuitability = new CompositeGoal('Functional Suitability', "The degree to which the software provides functions that meet stated and implied needs when used under specified conditions. It assesses whether the software includes all the necessary functionalities to fulfill the users' objectives and tasks efficiently and effectively", undefined, 1);
        this.addGoal(functionalSuitability);

        /* Functional Completeness */
        const functionalCompleteness = new LeafGoal('Functional Completeness', "The degree to which the set of functions covers all the specified tasks and user objectives", functionalSuitability, 1);
        this.addSubGoal(functionalCompleteness, functionalSuitability);

        /* Functional Correctness */
        const functionalCorrectness = new LeafGoal('Functional Correctness', "The degree to which the software provides correct results with the needed degree of precision", functionalSuitability, 1);
        this.addSubGoal(functionalCorrectness, functionalSuitability);

        /* Functional Appropriateness */
        const functionalAppropriateness = new LeafGoal('Functional Appropriateness', "The degree to which the functions facilitate the accomplishment of specified tasks and objectives", functionalSuitability, 1);
        this.addSubGoal(functionalAppropriateness, functionalSuitability);
    }

    /**
     * Builds the Performance Efficiency characteristic and its sub-characteristics:
     * Time Behavior, Resource Utilization, and Capacity
     */
    private buildPerformanceEfficiencyCharacteristics() {
        /* Performance Efficiency */
        const performanceEfficiency = new CompositeGoal('Performance Efficiency', "The software's capability to perform its functions within specified time, resources, and throughput parameters under stated conditions. It focuses on the effectiveness of the software in utilizing system resources while maintaining optimal performance.", undefined, 1);
        this.addGoal(performanceEfficiency);

        /* Time Behavior */
        const timeBehavior = new LeafGoal('Time Behavior', "The response and processing times and throughput rates of the software under stated conditions", performanceEfficiency, 1);
        this.addSubGoal(timeBehavior, performanceEfficiency);

        /* Resource Utilization */
        const resourceUtilization = new LeafGoal('Resource Utilization', "The amounts and types of resources used by the software when performing its function", performanceEfficiency, 1);
        this.addSubGoal(resourceUtilization, performanceEfficiency);

        /* Capacity */
        const capacity = new LeafGoal('Capacity', "The maximum limits of the software to perform its function under specific conditions", performanceEfficiency, 1);
        this.addSubGoal(capacity, performanceEfficiency);
    }

    /**
     * Builds the Compatibility characteristic and its sub-characteristics:
     * Co-existence, Interoperability
     */
    private buildCompatibilityCharacteristics() {
        /* Compatibility */
        const compatibility = new CompositeGoal('Compatibility', "The ability of a product to exchange information with other products, and/or to perform its required functions while sharing the same common environment and resources", undefined, 1);
        this.addGoal(compatibility);

        /* Co-existence */
        const coExistence = new LeafGoal('Co-existence', "The ability of the software to perform its required functions efficiently while sharing a common environment and resources with other products, without detrimental impact on any other product", compatibility, 1);
        this.addSubGoal(coExistence, compatibility);

        /* Interoperability */
        const interoperability = new LeafGoal('Interoperability', "The ability of a product to exchange information with other products and mutually use the information that has been exchanged", compatibility, 1);
        this.addSubGoal(interoperability, compatibility);
    }

    /**
     * Builds the Reliability characteristic and its sub-characteristics:
     * Faultlessness, Availability, Fault Tolerance, Recoverability
     */
    private buildReliabilityCharacteristics() {
        /* Reliability */
        const reliability = new CompositeGoal('Reliability', "The software's ability to perform its required functions under specified conditions for a specified period", undefined, 1);
        this.addGoal(reliability);

        /* Faultlessness */
        const faultlessness = new LeafGoal('Faultlessness', "The capability of the software to perform its functions without faults under normal operation", reliability, 1);
        this.addSubGoal(faultlessness, reliability);

        /* Availability */
        const availability = new LeafGoal('Availability', 'The capability of the software to be operational and accessible when required for use', reliability, 1);
        this.addSubGoal(availability, reliability);

        /* Fault Tolerance */
        const faultTolerance = new LeafGoal('Fault Tolerance', "The degree to which the software operates as intended despite hardware or software faults", reliability, 1);
        this.addSubGoal(faultTolerance, reliability);

        /* Recoverability */
        const recoverability = new LeafGoal('Recoverability', "The degree to which the software operates as intended despite hardware or software faults", reliability, 1);
        this.addSubGoal(recoverability, reliability);
    }

    /**
     * Builds the Security characteristic and its sub-characteristics:
     * Confidentiality, Integrity, Non-repudiation, Accountability, Authenticity, Resistance
     */
    private buildSecurityCharacteristics() {
        /* Security */
        const security = new CompositeGoal('Security', "The capability of a software to protect information and data so that persons or other software have the degree of data access appropriate to their types and levels of authorization, and to defend against attack patterns by malicious actors", undefined, 1);
        this.addGoal(security);

        /* Confidentiality */
        const confidentiality = new LeafGoal('Confidentiality', "The degree to which the software ensures that data are accessible only to those authorized to access them", security, 1);
        this.addSubGoal(confidentiality, security);

        /* Integrity */
        const integrity = new LeafGoal('Integrity', "The degree to which the software prevents unauthorized access to, or modification of, computer programs or data", security, 1);
        this.addSubGoal(integrity, security);

        /* Non-repudiation */
        const nonRepudiation = new LeafGoal('Non-repudiation', "The degree to which actions or events can be proven to have taken place so that the actions or events cannot be repudiated later", security, 1);
        this.addSubGoal(nonRepudiation, security);

        /* Accountability */
        const accountability = new LeafGoal('Accountability', "The degree to which the actions of an entity can be traced uniquely to the entity", security, 1);
        this.addSubGoal(accountability, security);

        /* Authenticity */
        const authenticity = new LeafGoal('Authenticity', "The capability of a software to prove that the identity of a subject or resource is the one claimed", security, 1);
        this.addSubGoal(authenticity, security);

        /* Resistance */
        const resistance = new LeafGoal('Resistance', "The degree to which a software can sustain operations while under attack from a malicious actor", security, 1);
        this.addSubGoal(resistance, security);
    }

    /**
     * Builds the Flexibility characteristic and its sub-characteristics:
     * Adaptability, Scalibility, Installability, Replaceability
     */
    private buildFlexibilityCharacteristics() {
        /* Flexibility */
        const flexibility = new CompositeGoal('Flexibility', "The ability of a software to be adapted to changes in its requirements, contexts of use, or system environment. This characteristic is essential for ensuring the software remains effective and relevant over time, accommodating evolving user needs and technological advancements", undefined, 1);
        this.addGoal(flexibility);

        /* Adaptability */
        const adaptability = new LeafGoal('Adaptability', "The capability of a software to be effectively and efficiently adapted for or transferred to different hardware, software or other operational or usage environments", flexibility, 1);
        this.addSubGoal(adaptability, flexibility);

        /* Scalability */
        const scalability = new LeafGoal('Scalability', "The capability of a software to handle growing or shrinking workloads or to adapt its capacity to handle variability", flexibility, 1);
        this.addSubGoal(scalability, flexibility);

        /* Installability */
        const installability = new LeafGoal('Installability', "The degree to which the software can be effectively and efficiently installed successfully and/or uninstalled in a specified environment", flexibility, 1);
        this.addSubGoal(installability, flexibility);

        /* Replaceability */
        const replaceability = new LeafGoal('Replaceability', "The capability of a software to be replaced by another specified product for the same purpose in the same environment", flexibility, 1);
        this.addSubGoal(replaceability, flexibility);
    }

    /**
     * Builds the Flexibility characteristic and its sub-characteristics:
     * Operational Constraint, Risk Identification, Fail Safe, Hazard Warning, Safe Integration
     */
    private buildSafetyCharacteristics() {
        /* Safety */
        const safety = new CompositeGoal('Safety', "The capability of a software under defined conditions to avoid a state in which human life, health, property, or the environment is endangered", undefined, 1);
        this.addGoal(safety);

        /* Operational Constraint */
        const operationalConstraint = new LeafGoal('Operational Constraint', "The capability of a software to constrain its operation to within safe parameters or states when encountering operational hazard", safety, 1);
        this.addSubGoal(operationalConstraint, safety);

        /* Risk Identification */
        const riskIdentification = new LeafGoal('Risk Identification', "The capability of a software to identify a course of events or operations that can expose life, property or environment to unacceptable risk", safety, 1);
        this.addSubGoal(riskIdentification, safety);

        /* Fail Safe */
        const failSafe = new LeafGoal('Fail Safe', "The capability of a software to automatically place itself in a safe operating mode, or to revert to a safe condition in the event of a failure", safety, 1);
        this.addSubGoal(failSafe, safety);

        /* Hazard Warning */
        const hazardWarning = new LeafGoal('Hazard Warning', "The capability of a software to provide warnings of unacceptable risks to operations or internal controls so that they can react in sufficient time to sustain safe operations", safety, 1);
        this.addSubGoal(hazardWarning, safety);

        /* Safe Integration */
        const safeIntegration = new LeafGoal('Safe Integration', "The capability of a software to maintain safety during and after integration with one or more components", safety, 1);
        this.addSubGoal(safeIntegration, safety);
    }

    /**
     * Builds the Energy Consumption characteristic and its sub-characteristics:
     * Physical Footprint and Ecological Footprint.
     */
    private buildEnergyConsumptionCharacteristics() {
        // Energy Consumption
        const energy = new CompositeGoal(
            'Energy Consumption',
            "The capability of the software to minimize energy usage during operation and reduce its environmental impact.",
            undefined,
            1
        );
        this.addGoal(energy);

        // Physical Footprint
        const physicalFootprint = new LeafGoal(
            'Physical Footprint',
            "The degree to which the software contributes to the reduction of energy used by the underlying hardware and infrastructure.",
            energy,
            1
        );
        this.addSubGoal(physicalFootprint, energy);

        // Ecological Footprint
        const ecologicalFootprint = new LeafGoal(
            'Ecological Footprint',
            "The degree to which the software is designed to lower its environmental impact, including carbon emissions and resource consumption throughout its lifecycle.",
            energy,
            1
        );
        this.addSubGoal(ecologicalFootprint, energy);
    }

}