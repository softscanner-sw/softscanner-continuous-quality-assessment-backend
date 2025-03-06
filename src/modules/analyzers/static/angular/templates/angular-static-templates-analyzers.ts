import { parseTemplate, TmplAstElement, TmplAstNode, TmplAstTemplate } from '@angular/compiler';
import * as fs from 'fs';
import * as path from "path";
import * as ts from 'ts-morph';
import { ComponentInfo } from "../../../../../core/analyzers/static/models/component-info";
import { TemplateAnalyzer } from "../../../../../core/analyzers/static/templates/static-template-analyzers-core";
import { AngularWidgetProcessor } from './widgets/angular-widgets-processor';

/**
 * Concrete implementation of TemplateAnalyzer for Angular.
 * Uses Angular’s template parser (and a widget processor) to extract component info.
 */
export class AngularTemplateAnalyzer extends TemplateAnalyzer {

    /**
     * Extracts the inline template or loads the external template file if specified from the decorator.
     * @param decorator The decorator of the template's corresponding component
     * @returns The template string if found, otherwise null.
     */
    extractTemplate(decorator: ts.Decorator): string | null {
        const args = decorator.getArguments();

        if (args.length) {
            const objLiteral = args[0].asKind(ts.SyntaxKind.ObjectLiteralExpression);
            if (objLiteral) {
                // If inline template is provided
                const templateProp = objLiteral.getProperty("template");
                if (templateProp?.isKind(ts.SyntaxKind.PropertyAssignment)) {
                    const initializer = templateProp.getInitializer();
                    if (initializer?.isKind(ts.SyntaxKind.StringLiteral))
                        return initializer.getLiteralText();
                }

                // If separate template file is provided
                const templateUrlProp = objLiteral.getProperty("templateUrl");
                if (templateUrlProp?.isKind(ts.SyntaxKind.PropertyAssignment)) {
                    const initializer = templateUrlProp.getInitializer();
                    if (initializer?.isKind(ts.SyntaxKind.StringLiteral)) {
                        // Resolve the full path of the template file
                        const componentFilePath = decorator.getSourceFile().getFilePath();
                        const componentDir = path.dirname(componentFilePath);
                        const templatePath = path.resolve(componentDir, initializer.getLiteralText());
                        try {
                            // Return the template's content
                            return fs.readFileSync(templatePath, "utf8");
                        } catch (err) {
                            console.error(`Angular Template Analyzer: Template file not found: ${templatePath}`);
                            return null;
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Analyzes the given Angular template to extract widgets and nested components.
     * @param decorator The decorator of the template's corresponding component
     * @returns A ComponentInfo object containing the extracted information.
     */
    async analyze(decorator: ts.Decorator): Promise<ComponentInfo> {
        // Extract the template based on the decorator
        const template = this.extractTemplate(decorator);

        if (!template) {
            throw new Error(`Angular Template Analyzer: No template found in for provided input: ${decorator.getName()}`);
        }

        // Extract the AST of the template
        const ast = parseTemplate(template, 'inline').nodes;

        // Process the template's widgets and extract them
        const widgetProcessor = new AngularWidgetProcessor(template);
        const widgets = widgetProcessor.processWidgets(ast);

        console.log('Angular Template Analyzer: Extracted Widgets: ', widgets);

        // Extract nested components (starting with app-) by traversing the AST
        const nestedComponents: string[] = [];
        const traverse = (nodes: TmplAstNode[]) => {
            nodes.forEach((node) => {
                if (node instanceof TmplAstElement && node.name.startsWith('app-')) {
                    // Add nested component
                    nestedComponents.push(node.name);
                }

                if (node instanceof TmplAstElement || node instanceof TmplAstTemplate) {
                    // Traverse children
                    traverse(node.children);
                }
            });
        };
        traverse(ast);

        // Fetch the component's selector
        const selector = decorator
            .getArguments()[0]
            ?.asKind(ts.SyntaxKind.ObjectLiteralExpression)
            ?.getProperty('selector')
            ?.asKind(ts.SyntaxKind.PropertyAssignment)
            ?.getInitializer()
            ?.getText()
            ?.replace(/['"`]/g, '');

        if (!selector)
            throw new Error('Angular Template Analyzer: Component selector could not be extracted.');

        return { selector, widgets, nestedComponents };
    }
}