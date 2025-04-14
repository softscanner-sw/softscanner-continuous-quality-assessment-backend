export interface DataSource<T> {
    create(item: Omit<T, "id" | "createdAt">): T;
    findAll(): T[];
    findById(id: string): T | undefined;
    update(id: string, updatedData: Partial<Omit<T, "id" | "createdAt">>): T | null;
    delete(id: string): boolean;
}
