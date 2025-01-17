export class TextProcessor {
    /**
     * Extracts keywords from the selected user goal by tokenizing and removing stop words
     * @param text the user goal text
     * @returns the keywords from the selected user goal text
     */
    public static extractKeywords(text: string): string[] {
        const stopWords = ['and', 'or', 'but', 'because', 'as', 'in', 'if', 'for', 'on', 'with', 'without'];
        return text.toLowerCase().split(/\s+/).filter(word => !stopWords.includes(word));
    }

    public static matchesKeywords(keywords: string[], text: string): boolean {
        if (!text)
            return false;

        const textKeywords = TextProcessor.extractKeywords(text);
        return keywords.some(keyword => textKeywords.includes(keyword));
    }
}