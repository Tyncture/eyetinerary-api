import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Itinerary } from './itinerary.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ItineraryService {
    constructor(
        @Inject('ITINERARY_REPOSITORY') private readonly repository: Repository<Itinerary>,
    ) {}

    async findOne(id: number): Promise<Itinerary> {
        return await this.repository.findOne({ id }, { relations: ['pages', 'pages.items'] });
    }

    async createNew(title: string, owner?: User): Promise<number> {
        const inserted = await this.repository
        .createQueryBuilder()
        .insert()
        .values({ title, editToken: 'test', owner })
        .execute();
        return inserted.identifiers[0].id;
    }
}
