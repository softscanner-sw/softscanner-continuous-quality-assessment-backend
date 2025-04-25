import * as ts from 'ts-morph';
import { BusinessLogicAnalyzer } from "../../../../../core/analyzers/static/business-logic/static-business-logic-analyzers-core";
import { RouteMap } from "../../../../../core/analyzers/static/models/route-info";
import { EventContext, EventHandlerCallContext, WidgetEventMap, WidgetInfo } from "../../../../../core/analyzers/static/models/widget-info";

/**
 * Concrete implementation of BusinessLogicAnalyzer for Angular.
 * Uses ts-morph to inspect the component’s TypeScript source to extract event handler calls.
 */
export class AngularBusinessLogicAnalyzer extends BusinessLogicAnalyzer {

    constructor(widgets: WidgetInfo[], routeMap: RouteMap) {
        super(widgets, routeMap);
    }

    /**
     * Analyzes the TypeScript file of a component to extract widget event mappings.
     * @param file The TypeScript source file.
     * @returns An array of WidgetEventMap objects representing widget interactions.
     */
    async analyze(file: ts.SourceFile): Promise<any[]> {
        const widgetEventMaps: WidgetEventMap[] = [];
        const methods = this.extractMethods(file); // Extracts methods
        const validationRules = this.extractValidationRules(file); // Extract validation rules

        for (const widget of this.widgets) {
            const eventContexts: EventContext[] = [];

            for (const [event, handler] of widget.events) {
                if (event === "routerLink") continue;

                const handlerBody = methods.get(handler);
                if (handlerBody) {
                    const calls = this.extractHandlerCalls(handlerBody, this.routeMap);
                    eventContexts.push({
                        event,
                        handler,
                        calls
                    });
                }
                else
                    console.warn(`Angular Business Logic Analyzer: Handler ${handler} for event ${event} not found.`);
            }

            // Map validation rules to the widget
            const controlName = widget.attributes?.formControlName;

            if (controlName && validationRules.has(controlName))
                widget.validationRules = validationRules.get(controlName);

            if (eventContexts.length > 0)
                widgetEventMaps.push({ widgetID: widget.id, events: eventContexts });
        }

        return widgetEventMaps;
    }

    /**
     * Extracts method declarations from a TypeScript class.
     * @param file The TypeScript source file.
     * @returns A map of method names to their declarations.
     */
    protected extractMethods(file: ts.SourceFile): Map<string, ts.MethodDeclaration> {
        const methods = new Map<string, ts.MethodDeclaration>();

        for (const cls of file.getClasses()) {
            for (const method of cls.getMethods()) {
                const methodName = method.getName();
                methods.set(methodName, method);
            }
        }

        return methods;
    }

    /**
     * Extracts function calls within an event handler and resolves navigation routes.
     * @param handler The method declaration containing function calls.
     * @param routeMap The application's route map for resolving navigation.
     * @returns An array of EventHandlerCallContext objects describing calls within the handler.
     */
    protected extractHandlerCalls(handler: ts.MethodDeclaration, routeMap: RouteMap): EventHandlerCallContext[] {
        const uniqueCalls = new Map<string, EventHandlerCallContext>(); // Store unique calls

        // Look for CallExpressions in the method body
        const callExpressions = handler.getDescendantsOfKind(ts.SyntaxKind.CallExpression);

        for (const call of callExpressions) {
            const caller = call.getExpression().getText();
            const args = call.getArguments();

            let resolvedRoute = "";
            let metadataParams: string[] = [];

            if (caller.includes('navigate')) {
                // Handle navigation calls
                if (args.length === 1 && args[0].isKind(ts.SyntaxKind.ArrayLiteralExpression)) {
                    const arrayArgs = args[0].asKind(ts.SyntaxKind.ArrayLiteralExpression)!.getElements();
                    const routeBase = arrayArgs[0].getText().replace(/['"`]/g, ""); // First argument
                    const routeParams = arrayArgs.slice(1).map(param => param.getText()); // Extract params

                    console.log(`Base route: ${routeBase}`);
                    console.log(`Route params: ${routeParams}`);

                    // Check if this route exists in the routeMap and if it has dynamic segments
                    for (const componentRoute of routeMap.components) {
                        if (componentRoute.route.startsWith(routeBase.substring(1))) {
                            const dynamicParts = componentRoute.route.split('/').filter(part => part.startsWith(':'));

                            console.log(`Dynamic route parts: ${dynamicParts}`);

                            if (dynamicParts.length > 0 && routeParams.length === dynamicParts.length) {
                                // Replace dynamic parameters correctly
                                resolvedRoute = `/${componentRoute.route}`;
                                metadataParams = routeParams; // Store real dynamic values

                                // Replace placeholders with actual dynamic references
                                dynamicParts.forEach((part, index) => {
                                    resolvedRoute = resolvedRoute.replace(part, `:${part.substring(1)}`);
                                });

                                console.log(`Final resolved route: ${resolvedRoute}`);
                                console.log(`Metadata Params: ${metadataParams}`);
                                break;
                            }
                        }
                    }
                }
            }
            else if (caller.includes('Service') || caller.includes('service')) {
                resolvedRoute = "/backend";
            }

            // Generate a unique key for the call
            const callKey = `${caller}->${resolvedRoute}`;

            // Only store the call if it's not already in the map
            if (!uniqueCalls.has(callKey) || uniqueCalls.get(callKey)!!.data.length < metadataParams.length) {
                uniqueCalls.set(callKey, {
                    caller,
                    called: resolvedRoute,
                    data: metadataParams
                });
            }
        }

        return Array.from(uniqueCalls.values());
    }

    /**
     * Extracts validation rules from form control definitions in the component's TypeScript file.
     * @param file The TypeScript source file.
     * @returns A map of form control names to their validation rules.
     */
    protected extractValidationRules(file: ts.SourceFile): Map<string, string[]> {
        const validationRules = new Map<string, string[]>();

        for (const cls of file.getClasses()) {
            for (const method of cls.getMethods()) {
                const statements = method.getStatements();

                statements.forEach(statement => {
                    const formGroupInit = statement.getDescendantsOfKind(ts.SyntaxKind.CallExpression)
                        .find(call => call.getExpression().getText().includes('this.formBuilder.group'));

                    if (formGroupInit) {
                        const controls = formGroupInit.getArguments()[0]
                            ?.asKind(ts.SyntaxKind.ObjectLiteralExpression);

                        if (controls) {
                            controls.getProperties().forEach(property => {
                                const name = property.isKind(ts.SyntaxKind.PropertyAssignment)
                                    ? property.getName()
                                    : '';

                                const initializer = property.isKind(ts.SyntaxKind.PropertyAssignment)
                                    ? property.getInitializer()
                                    : undefined;

                                const validationArray = initializer?.isKind(ts.SyntaxKind.ArrayLiteralExpression)
                                    ? initializer
                                    : undefined;

                                if (name && validationArray) {
                                    const rules: string[] = [];
                                    validationArray.getElements().forEach(element => {
                                        if (element.getText().includes("Validators")) {
                                            rules.push(element.getText());
                                        }
                                    });
                                    validationRules.set(name.replace(/['"]/g, ''), rules);
                                }
                            });
                        }
                    }
                });
            }
        }

        return validationRules;
    }
}