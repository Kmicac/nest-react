import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import * as cookieParser from 'cookie-parser';
import * as helmet from 'helmet';

import { AppModule } from './app.module';
import { Role } from './enums/role.enum';
import { User } from './user/user.entity';

async function createAdminOnFirstUse() {
  const shouldSeed = process.env.SEED_ADMIN_ON_BOOT === 'true';
  if (!shouldSeed) {
    return;
  }

  const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = await User.findOne({
    where: { username: defaultUsername },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await User.create({
      firstName: defaultUsername,
      lastName: defaultUsername,
      isActive: true,
      username: defaultUsername,
      role: Role.Admin,
      password: hashedPassword,
    }).save();
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Carna Project API')
      .setDescription('Carna Project API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/api/docs', app, document);
  }

  await createAdminOnFirstUse();

  await app.listen(5000);
}
bootstrap();
