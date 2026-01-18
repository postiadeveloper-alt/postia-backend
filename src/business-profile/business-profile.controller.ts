import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessProfileService } from './business-profile.service';
import { CreateBusinessProfileDto, UpdateBusinessProfileDto } from './dto/business-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('business-profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business-profile')
export class BusinessProfileController {
  constructor(private readonly businessProfileService: BusinessProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create business profile for Instagram account' })
  create(@Body() createBusinessProfileDto: CreateBusinessProfileDto) {
    return this.businessProfileService.create(createBusinessProfileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all business profiles for current user' })
  findAllByUser(@Request() req) {
    return this.businessProfileService.findAllByUser(req.user.id);
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Get business profile by Instagram account ID' })
  findByAccount(@Param('accountId') accountId: string) {
    return this.businessProfileService.findByAccount(accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get business profile by ID' })
  findOne(@Param('id') id: string) {
    return this.businessProfileService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update business profile' })
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateBusinessProfileDto: UpdateBusinessProfileDto,
  ) {
    return this.businessProfileService.update(id, req.user.id, updateBusinessProfileDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete business profile' })
  remove(@Param('id') id: string, @Request() req) {
    return this.businessProfileService.remove(id, req.user.id);
  }
}
