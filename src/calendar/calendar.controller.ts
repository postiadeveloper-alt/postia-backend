import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) { }

  @Post('posts')
  @ApiOperation({ summary: 'Create a new post' })
  create(@Body() createPostDto: CreatePostDto) {
    return this.calendarService.create(createPostDto);
  }

  @Get('posts')
  @ApiOperation({ summary: 'Get all posts for current user' })
  findAll(@Request() req) {
    return this.calendarService.findAll(req.user.id);
  }

  @Get('posts/account/:accountId')
  @ApiOperation({ summary: 'Get all posts for specific Instagram account' })
  findByAccount(
    @Param('accountId') accountId: string,
    @Request() req,
  ) {
    return this.calendarService.findByAccount(accountId, req.user.id);
  }

  @Get('posts/account/:accountId/range')
  @ApiOperation({ summary: 'Get posts by date range' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  findByDateRange(
    @Param('accountId') accountId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    return this.calendarService.findByDateRange(
      accountId,
      req.user.id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('posts/account/:accountId/upcoming')
  @ApiOperation({ summary: 'Get upcoming scheduled posts' })
  @ApiQuery({ name: 'limit', required: false })
  getUpcoming(
    @Param('accountId') accountId: string,
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    return this.calendarService.getUpcoming(accountId, req.user.id, limit);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get post by ID' })
  findOne(@Param('id') id: string) {
    return this.calendarService.findOne(id);
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Update post' })
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.calendarService.update(id, req.user.id, updatePostDto);
  }

  @Post('posts/:id/publish')
  @ApiOperation({ summary: 'Publish post to Instagram' })
  publish(@Param('id') id: string) {
    return this.calendarService.publish(id);
  }

  @Post('posts/:id/publish-now')
  @ApiOperation({ summary: 'Publish post to Instagram immediately' })
  publishNow(@Param('id') id: string) {
    return this.calendarService.publishNow(id);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete post' })
  remove(@Param('id') id: string, @Request() req) {
    return this.calendarService.remove(id, req.user.id);
  }
}
