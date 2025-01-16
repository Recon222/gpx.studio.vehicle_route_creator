export interface CSVWaypoint {
    timestamp?: Date;
    address?: string;
    latitude: number;
    longitude: number;
    notes?: string;
}

export interface CSVProcessingResult {
    waypoints: CSVWaypoint[];
    errors?: string[];
}

export interface CSVProcessingProgress {
    total: number;
    current: number;
    currentWaypoint?: CSVWaypoint;
} 