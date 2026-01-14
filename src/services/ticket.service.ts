import { Ticket, ITicket, IRoom } from '../models';
import { generateTicket } from '../lib/number-generator';

export class TicketService {
    static async createTickets(roomCode: string, ownerId: string, count: number, maxPerPlayer: number): Promise<ITicket[]> {
        const existingCount = await Ticket.countDocuments({ roomCode: roomCode.toUpperCase(), ownerId });
        const allowed = Math.max(0, maxPerPlayer - existingCount);
        const actualCount = Math.min(count, allowed);

        if (actualCount <= 0) return [];

        const newTickets: ITicket[] = [];
        for (let i = 0; i < actualCount; i++) {
            const ticketData = generateTicket(roomCode.toUpperCase(), ownerId);
            const ticket = new Ticket(ticketData);
            newTickets.push(ticket);
        }

        await Ticket.insertMany(newTickets);
        return newTickets;
    }

    static async markNumber(ticketId: string, grid: number, row: number, col: number): Promise<void> {
        const MAX_RETRIES = 3;
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                const ticket = await Ticket.findOne({ id: ticketId });
                if (!ticket) return;

                if (ticket.grids[grid] && ticket.grids[grid].rows[row]) {
                    const rowData = ticket.grids[grid].rows[row];
                    if (rowData.cells[col] !== null) {
                        rowData.marked[col] = !rowData.marked[col];
                        ticket.markModified('grids');
                        await ticket.save();
                    }
                }
                break; // Success
            } catch (error: any) {
                if (error.name === 'VersionError' && attempt < MAX_RETRIES - 1) {
                    attempt++;
                    continue; // Retry
                }
                console.error('Error marking number:', error);
                throw error; // Rethrow other errors or if retries exhausted
            }
        }
    }

    static async getPlayerTickets(roomCode: string, ownerId: string): Promise<ITicket[]> {
        return Ticket.find({ roomCode: roomCode.toUpperCase(), ownerId });
    }

    static async getTickets(roomCode: string, ownerId: string): Promise<any[]> {
        return Ticket.find({ roomCode: roomCode.toUpperCase(), ownerId });
    }

    static async getTicketById(id: string): Promise<ITicket | null> {
        return Ticket.findOne({ id });
    }
}
