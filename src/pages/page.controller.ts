import {
  Controller,
  Get,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
  Post,
  Delete,
  UnauthorizedException,
  Req,
  Patch,
  ForbiddenException,
} from '@nestjs/common';
import { PageService } from './page.service';
import { Page } from './page.entity';
import { ItineraryService } from '../itineraries/itinerary.service';
import { Itinerary } from '../itineraries/itinerary.entity';
import { CreatePageDto } from './dto/createPageDto.dto';
import { IntineraryAuth } from '../itineraries/itinerary.auth';
import { DeletePageDto } from './dto/deletePageDto.dto';
import { EditPageDto } from './dto/editPageDto.dto';
import { Validator } from 'class-validator';

@Controller('page')
export class PageController {
  private validator: Validator;
  constructor(
    private readonly pageService: PageService,
    private readonly itineraryService: ItineraryService,
    private readonly itineraryAuth: IntineraryAuth,
  ) {
    this.validator = new Validator();
  }

  @Get(':id')
  async getPage(@Param() params) {
    const validParams = this.validator.isNumberString(params.id);
    if (!validParams) {
      throw new BadRequestException('id must be an  integer', 'Bad Request');
    }

    const page: Page = await this.pageService.findOne(params.id);
    if (page) {
      return {
        success: true,
        ...page,
      };
    } else {
      throw new NotFoundException(
        `Page ${params.id} not found`,
        'Page Not Found',
      );
    }
  }

  @Post()
  async createPage(@Body() body: CreatePageDto, @Req() req) {
    const itinerary: Itinerary = await this.itineraryService.findOne(
      body.itinerary,
    );

    if (!itinerary) {
      throw new BadRequestException(
        `Itinerary ${body.itinerary} not found`,
        'Itinerary Not Found',
      );
    }

    if (body.rankInItinerary) {
      await this.verifyRankAvailable(itinerary, body.rankInItinerary);
    }

    if (body.editToken) {
      await this.itineraryAuth.verifyEditToken(body.editToken, itinerary);
    } else if (req.token) {
      await this.itineraryAuth.verifyOwnership(req.token, itinerary);
    } else {
      throw new UnauthorizedException('No Token Supplied', 'No Token Supplied');
    }

    const page: Page = await this.pageService.createNew(
      body.title,
      itinerary,
      body.rankInItinerary,
    );
    return {
      success: true,
      ...page,
    };
  }

  @Patch(':id')
  async editPage(@Param() params, @Body() body: EditPageDto, @Req() req) {
    const page: Page = await this.pageService.findOne(params.id);
    if (!page) {
      throw new NotFoundException(
        `Page ${params.id} not found`,
        'Page Not Found',
      );
    }

    // Verifcation procedures
    if (body.rankInItinerary) {
      await this.verifyRankAvailable(page.itinerary, body.rankInItinerary);
    }
    // Verify authentication
    if (body.editToken) {
      await this.itineraryAuth.verifyEditToken(body.editToken, page.itinerary);
    } else if (req.token) {
      await this.itineraryAuth.verifyOwnership(req.token, page.itinerary);
    } else {
      throw new UnauthorizedException('No Token Supplied', 'No Token Supplied');
    }

    const updated: Page = await this.pageService.updateOne(
      page.id,
      body.title,
      body.rankInItinerary,
    );
    return {
      success: true,
      updated,
    };
  }

  @Delete(':id')
  async deletePage(@Param() params, @Body() body: DeletePageDto, @Req() req) {
    const page: Page = await this.pageService.findOne(params.id);
    if (!page) {
      throw new NotFoundException(
        `Page ${params.id} not found`,
        'Page Not Found',
      );
    }

    if (body.editToken) {
      await this.itineraryAuth.verifyEditToken(body.editToken, page.itinerary);
    } else if (req.token) {
      await this.itineraryAuth.verifyOwnership(req.token, page.itinerary);
    } else {
      throw new UnauthorizedException('No Token Supplied', 'No Token Supplied');
    }

    const deleted: Page = await this.pageService.deleteOne(params.id);
    return {
      success: true,
      deleted,
    };
  }

  private async verifyRankAvailable(itinerary: Itinerary, rank: number) {
    const rankTaken = !(await this.pageService.rankAvailable(itinerary, rank));
    if (rankTaken) {
      throw new ForbiddenException(
        `Rank ${rank} already in use for itinerary ${itinerary.id}`,
        'Rank Taken',
      );
    }
  }
}
