export interface Collection {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string | null;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
}
