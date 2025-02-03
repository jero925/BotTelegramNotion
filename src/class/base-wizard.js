import { Scenes } from 'telegraf';

export class BaseWizard {
    /**
     * Constructor for BaseWizard.
     * @param {string} sceneId - The ID of the scene.
     * @param {Object} steps - The steps configuration for the wizard.
     * @throws {Error} If sceneId is invalid or steps are not provided.
     */
    constructor(sceneId, steps) {
        if (!sceneId || typeof sceneId !== 'string') {
            throw new Error('A valid sceneId is required.');
        }

        if (!steps || typeof steps !== 'object' || Object.keys(steps).length === 0) {
            throw new Error('A valid steps dictionary is required.');
        }

        this.steps = {};

        const stepHandlers = Object.entries(steps) // Gey key-value
            .sort(([, a], [, b]) => a.step - b.step)
            .map(([name, step], index) => {
                // Save step index
                Object.defineProperty(this.steps, name, {
                    value: index,
                    writable: false,
                    enumerable: true,
                    configurable: false,
                });

                // Verify the handler is defined
                if (typeof this[step.handler] !== 'function') {
                    throw new Error(`Handler '${step.handler}' is not defined in the class.`);
                }

                return this[step.handler].bind(this);
            });

        // Create the wizard scene
        this.scene = new Scenes.WizardScene(sceneId, ...stepHandlers);
    }

    /**
     * Builds the steps configuration from an array of step definitions.
     * @param {Array<{name: string, handler: string}>} stepDefinitions - Array of step definitions.
     * @returns {Object} - The steps configuration object.
     */
    static buildSteps(stepDefinitions) {
        return stepDefinitions.reduce((steps, stepDefinition, index) => {
            const { name, handler } = stepDefinition;

            if (!name || !handler) {
                throw new Error(`Step definition at index ${index} is missing 'name' or 'handler'.`);
            }

            steps[name] = {
                step: index,
                handler: handler
            };
            return steps;
        }, {});
    }

    /**
     * Gets the index of a step by its name.
     * @param {string} stepName - The name of the step.
     * @returns {number|null} - The step index or null if not found.
     */
    getStepIndex(stepName) {
        return this.steps[stepName] ?? null;
    }
}
