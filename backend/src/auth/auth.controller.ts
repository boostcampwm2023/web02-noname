import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserAuthDto } from './dto/create-auth.dto';
import { SigninUserAuthDto } from './dto/signin-auth.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/users')
  // @Redirect('/index', 301) //TODO: 홈으로 가게끄
  @UsePipes(ValidationPipe)
  async create(
    @Body() createUserAuthDto: CreateUserAuthDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const dto = await this.authService.create(createUserAuthDto);
    response
      .cookie('publicId', dto.publicId)
      .cookie('isMaster', dto.isMaster)
      .status(200)
      .json(dto);
  }

  @Post('/users/signin')
  @UsePipes(ValidationPipe)
  async signin(
    @Body() signinUserAuthDto: SigninUserAuthDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const dto = await this.authService.signin(signinUserAuthDto);
    response
      .cookie('publicId', dto.publicId)
      .cookie('isMaster', dto.isMaster)
      .status(200)
      .json(dto);
  }

  @Get('/users/signout')
  signout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.authService.signout(request.cookies['publicId']);
    response.clearCookie('publicId').clearCookie('isMaster');
  }

  @Get('/users')
  async checkLogin(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.checkLogin(
      request.cookies['publicId'],
    );
    if (result) {
      return result;
    }
    response.clearCookie('publicId').clearCookie('isMaster');
    throw new UnauthorizedException('not logined');
  }

  @Post('users/duplicateEmail')
  @HttpCode(200)
  async duplicateEmail(@Body() body: { email: string }) {
    const user = await this.authService.existUserByEmail(body.email);
    if (user) {
      return { duplicateEmail: true };
    } else {
      return { duplicateEmail: false };
    }
  }

  @Post('users/duplicatePublicId')
  @HttpCode(200)
  async duplicatePublicId(@Body() body: { publicId: string }) {
    const user = await this.authService.existUserByPublicId(body.publicId);
    if (user) {
      return { duplicatePublicId: true };
    } else {
      return { duplicatePublicId: false };
    }
  }
}
