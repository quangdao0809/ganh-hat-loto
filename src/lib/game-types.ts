// Game Types for Lô Tô Virtual Show

export interface CalledNumber {
  number: number;
  calledAt: Date;
}

// 9 columns: 1-9, 10-19, ..., 80-90
export interface TicketRow {
  cells: (number | null)[]; // 9 cells, null if empty
  marked: boolean[];        // 9 booleans (true if cell has number AND is marked)
}

export interface TicketGrid {
  rows: [TicketRow, TicketRow, TicketRow];
}

export interface LotoTicket {
  id: string;
  grids: TicketGrid[]; // 3 grids per ticket
  ownerId: string;
  roomCode: string;
  createdAt: Date;
}

export interface Player {
  oderId: string;
  nickname: string;
  socketId?: string;
  tickets: string[]; // ticket IDs
  joinedAt: Date;
}

export interface GameSession {
  id: string;
  roomId: string;
  calledNumbers: CalledNumber[];
  startedAt: Date;
  endedAt?: Date;
  winnerId?: string;
  winningTicketId?: string;
  winningRow?: number;
}

export interface Room {
  id: string;
  code: string; // 6-character room code
  hostId: string;
  hostSocketId?: string;
  players: Player[];
  currentSession?: GameSession;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  settings: RoomSettings;
}

export interface RoomSettings {
  maxPlayers: number;
  ticketsPerPlayer: number;
  maxTicketsPerPlayer: number; // Added
  autoCall: boolean;           // Added
  callSpeed: number;           // Added (seconds)
  checkMode: 'manual' | 'auto'; // Added
  autoMarkNumbers: boolean;
  audioMode: 'singing' | 'calling';
}

// Socket Events
export type ServerToClientEvents = {
  'room:updated': (room: Room) => void;
  'game:number-called': (data: { number: number; folkName: string; calledNumbers: number[] }) => void;
  'game:winner': (data: { winnerId: string; nickname: string; ticketId: string; row: number }) => void;
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'player:kinh-called': (data: { playerId: string; nickname: string; ticketId: string; row: number }) => void;
  'error': (message: string) => void;
};

export type ClientToServerEvents = {
  'room:create': (hostNickname: string, settings: Partial<RoomSettings>, callback: (room: Room) => void) => void;
  'room:join': (code: string, nickname: string, callback: (room: Room | null, error?: string) => void) => void;
  'room:leave': () => void;
  'game:spin': () => void;
  'game:reset': () => void;
  'player:create-ticket': (count: number, callback: (tickets: LotoTicket[]) => void) => void;
  'player:mark-number': (ticketId: string, row: number, index: number) => void;
  'player:call-kinh': (ticketId: string, row: number) => void;
  'host:validate-ticket': (ticketId: string, callback: (result: ValidationResult) => void) => void;
  'host:validate-numbers': (numbers: number[], callback: (result: ValidationResult) => void) => void;
};

export interface ValidationResult {
  isValid: boolean;
  isWinner: boolean;
  matchedNumbers: number[];
  missingNumbers: number[];
}

// Audio Types
export interface AudioConfig {
  essentialLoaded: boolean;
  variantsLoaded: number; // percentage 0-100
  bgmVolume: number;
  effectsVolume: number;
  muted: boolean;
}
