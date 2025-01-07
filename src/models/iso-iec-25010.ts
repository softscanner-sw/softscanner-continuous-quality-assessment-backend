import { CompositeCharacteristic, LeafCharacteristic } from "../core/characteristics/characteristics-core";
import { QualityModel } from "../core/model/model-core";

/**
 * Represents the ISO/IEC 25010 software quality model, detailing its characteristics and sub-characteristics.
 */
export class ISOIEC25010 extends QualityModel {
    constructor(){
        /* Quality Model Metadata */
        super('ISO/IEC 25010 - Product Quality Model', '2023', [],
        'The ISO/IEC 25010 (2023) identifies eight main quality characteristics of software systems, each divided into sub-characteristics. These are Interaction Capability, Functional Suitability, Performance Efficiency, Compatibility, Reliability, Security, Flexibility, and Safety. Each of these characteristics and their sub-characteristics is crucial in assessing and ensuring the overall quality of software systems and products. They provide a comprehensive framework for understanding various dimensions of software quality from the product perspective. This detailed framework is invaluable for software developers, quality assurance professionals, and evaluators in creating, assessing, and ensuring high-quality software products',
        'https://www.iso.org/obp/ui/#iso:std:iso-iec:25010:ed-2:v1:en');

        /* Build the quality model (sub-)characteristics */
        this.buildCharacteristics();
    }

    /**
     * Clears then rebuilds the ISO/IEC 25010 (2023) quality model's characteristics
     */
    public rebuild(){
        this.clearCharacteristics();
        this.buildCharacteristics();
    }

    /**
     * Builds all (sub-)characteristics of the ISO/IEC 25010 model (2023)
     */
    private buildCharacteristics(){
        this.buildInteractionCapabilityCharacteristics(); // Interaction Capability
        this.buildFunctionalSuitabilityCharacteristics(); // Functional Suitability
        this.buildPerformanceEfficiencyCharacteristics(); // Performance Efficiency
        this.buildCompatibilityCharacteristics(); // Compatibility
        this.buildReliabilityCharacteristics(); // Reliability
        this.buildSecurityCharacteristics(); // Security
        this.buildFlexibilityCharacteristics(); // Flexibility
        this.buildSafetyCharacteristics(); // Safety
    }

    /**
     * Builds the Interaction Capability characteristic and its sub-characteristics:
     * Appropriateness Recognizability, Learnability, Operability, User Error Protection,
     * User Engagement, Inclusivity, User Assistance, and Self-Descriptiveness
     */
    private buildInteractionCapabilityCharacteristics(){
        /* Interaction Capability */
        const interactionCapability = new CompositeCharacteristic('Interaction Capability', 'The ability of a product to be interacted with by specified users to exchange information between a user and a system via the user interface to complete the intended task', 1, undefined, this);
        this.addCharacteristic(interactionCapability);

        /* Appropriateness Recognizability */
        const appropriatenessRecognizability = new LeafCharacteristic('Appropriateness Recognizability', 'The degree to which users can recognize whether the software is appropriate for their needs', 1, interactionCapability, this);
        this.addSubCharacteristic(appropriatenessRecognizability, interactionCapability);

        /* Learnability */
        const learnability = new LeafCharacteristic('Learnability', 'The degree to which the software can be learned by users', 1, interactionCapability, this);
        this.addSubCharacteristic(learnability, interactionCapability);

        /* Operability */
        const operability = new LeafCharacteristic('Operability', 'The degree to which the software is user-friendly and controllable', 1, interactionCapability, this);
        this.addSubCharacteristic(operability, interactionCapability);

        /* User Error Protection */
        const userErrorProtection = new LeafCharacteristic('User Error Protection', 'The degree to which the software is user-friendly and controllable', 1, interactionCapability, this);
        this.addSubCharacteristic(userErrorProtection, interactionCapability);

        /* User Engagement */
        const userEngagement = new LeafCharacteristic('User Engagement', 'The degree to which the software presents functions and information in an inviting and motivating manner encouraging continued interaction', 1, interactionCapability, this);
        this.addSubCharacteristic(userEngagement, interactionCapability);

        /* Inclusivity */
        const inclusivity = new LeafCharacteristic('Inclusivity', 'The degree to which the software can be utilized by people of various backgrounds', 1, interactionCapability, this);
        this.addSubCharacteristic(inclusivity, interactionCapability);

        /* User Assistance */
        const userAssistance = new LeafCharacteristic('User Assistance', 'The degree to which a software can be used by people with the widest range of characteristics and capabilities to achieve specified goals in a specified context of use', 1, interactionCapability, this);
        this.addSubCharacteristic(userAssistance, interactionCapability);

        /* Self-Descriptiveness */
        const selfDescriptiveness = new LeafCharacteristic('Self-Descriptiveness', 'The degree to which a software can present appropriate information, where needed by the user, to make its capabilities and use immediately obvious to the user without excessive interactions with a product or other resources', 1, interactionCapability, this);
        this.addSubCharacteristic(selfDescriptiveness, interactionCapability);
    }

    /**
     * Builds the Functional Suitability characteristic and its sub-characteristics:
     * Functional Completeness, Functional Correctness, and Functional Appropriateness
     */
    private buildFunctionalSuitabilityCharacteristics(){
        /* Functional Suitability */
        const functionalSuitability = new CompositeCharacteristic('Functional Suitability', "The degree to which the software provides functions that meet stated and implied needs when used under specified conditions. It assesses whether the software includes all the necessary functionalities to fulfill the users' objectives and tasks efficiently and effectively", 1, undefined, this);
        this.addCharacteristic(functionalSuitability);

        /* Functional Completeness */
        const functionalCompleteness = new LeafCharacteristic('Functional Completeness', "The degree to which the set of functions covers all the specified tasks and user objectives", 1, functionalSuitability, this);
        this.addSubCharacteristic(functionalCompleteness, functionalSuitability);

        /* Functional Correctness */
        const functionalCorrectness = new LeafCharacteristic('Functional Correctness', "The degree to which the software provides correct results with the needed degree of precision", 1, functionalSuitability, this);
        this.addSubCharacteristic(functionalCorrectness, functionalSuitability);

        /* Functional Appropriateness */
        const functionalAppropriateness = new LeafCharacteristic('Functional Appropriateness', "The degree to which the functions facilitate the accomplishment of specified tasks and objectives", 1, functionalSuitability, this);
        this.addSubCharacteristic(functionalAppropriateness, functionalSuitability);
    }

    /**
     * Builds the Performance Efficiency characteristic and its sub-characteristics:
     * Time Behavior, Resource Utilization, and Capacity
     */
    private buildPerformanceEfficiencyCharacteristics() {
        /* Performance Efficiency */
        const performanceEfficiency = new CompositeCharacteristic('Performance Efficiency', "The software's capability to perform its functions within specified time, resources, and throughput parameters under stated conditions. It focuses on the effectiveness of the software in utilizing system resources while maintaining optimal performance.", 1, undefined, this);
        this.addCharacteristic(performanceEfficiency);

        /* Time Behavior */
        const timeBehavior = new LeafCharacteristic('Time Behavior', "The response and processing times and throughput rates of the software under stated conditions", 1, performanceEfficiency, this);
        this.addSubCharacteristic(timeBehavior, performanceEfficiency);

        /* Resource Utilization */
        const resourceUtilization = new LeafCharacteristic('Resource Utilization', "The amounts and types of resources used by the software when performing its function", 1, performanceEfficiency, this);
        this.addSubCharacteristic(resourceUtilization, performanceEfficiency);

        /* Capacity */
        const capacity = new LeafCharacteristic('Capacity', "The maximum limits of the software to perform its function under specific conditions", 1, performanceEfficiency, this);
        this.addSubCharacteristic(capacity, performanceEfficiency);
    }

    /**
     * Builds the Compatibility characteristic and its sub-characteristics:
     * Co-existence, Interoperability
     */
    private buildCompatibilityCharacteristics(){
        /* Compatibility */
        const compatibility = new CompositeCharacteristic('Compatibility', "The ability of a product to exchange information with other products, and/or to perform its required functions while sharing the same common environment and resources", 1, undefined, this);
        this.addCharacteristic(compatibility);

        /* Co-existence */
        const coExistence = new LeafCharacteristic('Co-existence', "The ability of the software to perform its required functions efficiently while sharing a common environment and resources with other products, without detrimental impact on any other product", 1, compatibility, this);
        this.addSubCharacteristic(coExistence, compatibility);

        /* Interoperability */
        const interoperability = new LeafCharacteristic('Interoperability', "The ability of a product to exchange information with other products and mutually use the information that has been exchanged", 1, compatibility, this);
        this.addSubCharacteristic(interoperability, compatibility);
    }

    /**
     * Builds the Reliability characteristic and its sub-characteristics:
     * Faultlessness, Availability, Fault Tolerance, Recoverability
     */
    private buildReliabilityCharacteristics(){
        /* Reliability */
        const reliability = new CompositeCharacteristic('Reliability', "The software's ability to perform its required functions under specified conditions for a specified period", 1, undefined, this);
        this.addCharacteristic(reliability);

        /* Faultlessness */
        const faultlessness = new LeafCharacteristic('Faultlessness', "The capability of the software to perform its functions without faults under normal operation", 1, reliability, this);
        this.addSubCharacteristic(faultlessness, reliability);

        /* Availability */
        const availability = new LeafCharacteristic('Availability', 'The capability of the software to be operational and accessible when required for use', 1, reliability, this);
        this.addSubCharacteristic(availability, reliability);

        /* Fault Tolerance */
        const faultTolerance = new LeafCharacteristic('Fault Tolerance', "The degree to which the software operates as intended despite hardware or software faults", 1, reliability, this);
        this.addSubCharacteristic(faultTolerance, reliability);

        /* Recoverability */
        const recoverability = new LeafCharacteristic('Recoverability', "The degree to which the software operates as intended despite hardware or software faults", 1, reliability, this);
        this.addSubCharacteristic(recoverability, reliability);
    }

    /**
     * Builds the Security characteristic and its sub-characteristics:
     * Confidentiality, Integrity, Non-repudiation, Accountability, Authenticity, Resistance
     */
    private buildSecurityCharacteristics(){
        /* Security */
        const security = new CompositeCharacteristic('Security', "The capability of a software to protect information and data so that persons or other software have the degree of data access appropriate to their types and levels of authorization, and to defend against attack patterns by malicious actors", 1, undefined, this);
        this.addCharacteristic(security);

        /* Confidentiality */
        const confidentiality = new LeafCharacteristic('Confidentiality', "The degree to which the software ensures that data are accessible only to those authorized to access them", 1, security, this);
        this.addSubCharacteristic(confidentiality, security);

        /* Integrity */
        const integrity = new LeafCharacteristic('Integrity', "The degree to which the software prevents unauthorized access to, or modification of, computer programs or data", 1, security, this);
        this.addSubCharacteristic(integrity, security);

        /* Non-repudiation */
        const nonRepudiation = new LeafCharacteristic('Non-repudiation', "The degree to which actions or events can be proven to have taken place so that the actions or events cannot be repudiated later", 1, security, this);
        this.addSubCharacteristic(nonRepudiation, security);

        /* Accountability */
        const accountability = new LeafCharacteristic('Accountability', "The degree to which the actions of an entity can be traced uniquely to the entity", 1, security, this);
        this.addSubCharacteristic(accountability, security);

        /* Authenticity */
        const authenticity = new LeafCharacteristic('Authenticity', "The capability of a software to prove that the identity of a subject or resource is the one claimed", 1, security, this);
        this.addSubCharacteristic(authenticity, security);

        /* Resistance */
        const resistance = new LeafCharacteristic('Resistance', "The degree to which a software can sustain operations while under attack from a malicious actor", 1, security, this);
        this.addSubCharacteristic(resistance, security);
    }

    /**
     * Builds the Flexibility characteristic and its sub-characteristics:
     * Adaptability, Scalibility, Installability, Replaceability
     */
    private buildFlexibilityCharacteristics(){
        /* Flexibility */
        const flexibility = new CompositeCharacteristic('Flexibility', "The ability of a software to be adapted to changes in its requirements, contexts of use, or system environment. This characteristic is essential for ensuring the software remains effective and relevant over time, accommodating evolving user needs and technological advancements", 1, undefined, this);
        this.addCharacteristic(flexibility);

        /* Adaptability */
        const adaptability = new LeafCharacteristic('Adaptability', "The capability of a software to be effectively and efficiently adapted for or transferred to different hardware, software or other operational or usage environments", 1, flexibility, this);
        this.addSubCharacteristic(adaptability, flexibility);

        /* Scalability */
        const scalability = new LeafCharacteristic('Scalability', "The capability of a software to handle growing or shrinking workloads or to adapt its capacity to handle variability", 1, flexibility, this);
        this.addSubCharacteristic(scalability, flexibility);

        /* Installability */
        const installability = new LeafCharacteristic('Installability', "The degree to which the software can be effectively and efficiently installed successfully and/or uninstalled in a specified environment", 1, flexibility, this);
        this.addSubCharacteristic(installability, flexibility);

        /* Replaceability */
        const replaceability = new LeafCharacteristic('Replaceability', "The capability of a software to be replaced by another specified product for the same purpose in the same environment", 1, flexibility, this);
        this.addSubCharacteristic(replaceability, flexibility);
    }

    /**
     * Builds the Flexibility characteristic and its sub-characteristics:
     * Operational Constraint, Risk Identification, Fail Safe, Hazard Warning, Safe Integration
     */
    private buildSafetyCharacteristics(){
        /* Safety */
        const safety = new CompositeCharacteristic('Safety', "The capability of a software under defined conditions to avoid a state in which human life, health, property, or the environment is endangered", 1, undefined, this);
        this.addCharacteristic(safety);

        /* Operational Constraint */
        const operationalConstraint = new LeafCharacteristic('Operational Constraint', "The capability of a software to constrain its operation to within safe parameters or states when encountering operational hazard", 1, safety, this);
        this.addSubCharacteristic(operationalConstraint, safety);

        /* Risk Identification */
        const riskIdentification = new LeafCharacteristic('Risk Identification', "The capability of a software to identify a course of events or operations that can expose life, property or environment to unacceptable risk", 1, safety, this);
        this.addSubCharacteristic(riskIdentification, safety);

        /* Fail Safe */
        const failSafe = new LeafCharacteristic('Fail Safe', "The capability of a software to automatically place itself in a safe operating mode, or to revert to a safe condition in the event of a failure", 1, safety, this);
        this.addSubCharacteristic(failSafe, safety);

        /* Hazard Warning */
        const hazardWarning = new LeafCharacteristic('Hazard Warning', "The capability of a software to provide warnings of unacceptable risks to operations or internal controls so that they can react in sufficient time to sustain safe operations", 1, safety, this);
        this.addSubCharacteristic(hazardWarning, safety);

        /* Safe Integration */
        const safeIntegration = new LeafCharacteristic('Safe Integration', "The capability of a software to maintain safety during and after integration with one or more components", 1, safety, this);
        this.addSubCharacteristic(safeIntegration, safety);
    }
}