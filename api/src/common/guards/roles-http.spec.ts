import { Controller, Get, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import { randomBytes } from 'node:crypto';
import { of } from 'rxjs';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AccountRole } from '../../accounts/account-role.js';
import { GlobalExceptionFilter } from '../filters/global-exception.filter.js';
import { HttpLoggingInterceptor } from '../interceptors/http-logging.interceptor.js';

// Üretim AppModule'ündeki guard sırası ve gerçek controller metadata'sı kullanılır.
// Yalnızca TCP taşıması taklit edilir; DB/Docker gerektirmez.
@Controller('policy-default')
class DefaultPolicyController {
  @Get()
  find() {
    return { ok: true };
  }
}

const allRoles = Object.values(AccountRole);
const adminOnly = [AccountRole.ADMIN];
const routes = [
  {
    method: 'get',
    path: '/teams',
    pattern: 'findAllTeams',
    roles: allRoles,
    status: 200,
  },
  {
    method: 'get',
    path: '/teams/1',
    pattern: 'findOneTeam',
    roles: allRoles,
    status: 200,
  },
  {
    method: 'post',
    path: '/teams',
    pattern: 'createTeam',
    roles: adminOnly,
    status: 201,
    body: { name: 'Test Ekibi' },
  },
  {
    method: 'patch',
    path: '/teams/1',
    pattern: 'updateTeam',
    roles: adminOnly,
    status: 200,
    body: { name: 'Yeni Ad' },
  },
  {
    method: 'delete',
    path: '/teams/1',
    pattern: 'removeTeam',
    roles: adminOnly,
    status: 204,
  },
  {
    method: 'post',
    path: '/teams/1/members',
    pattern: 'addTeamMember',
    roles: adminOnly,
    status: 201,
    body: { workforceUserId: 2 },
  },
  {
    method: 'delete',
    path: '/teams/1/members/2',
    pattern: 'removeTeamMember',
    roles: adminOnly,
    status: 204,
  },
  {
    method: 'get',
    path: '/workforce-users',
    pattern: 'findAllWorkforceUsers',
    roles: allRoles,
    status: 200,
  },
  {
    method: 'get',
    path: '/workforce-users/1',
    pattern: 'findOneWorkforceUser',
    roles: allRoles,
    status: 200,
  },
  {
    method: 'post',
    path: '/workforce-users',
    pattern: 'createWorkforceUser',
    roles: adminOnly,
    status: 201,
    body: {
      firstName: 'Test',
      lastName: 'Personel',
      registrationNumber: 'T27',
    },
  },
  {
    method: 'patch',
    path: '/workforce-users/1',
    pattern: 'updateWorkforceUser',
    roles: adminOnly,
    status: 200,
    body: { firstName: 'Yeni' },
  },
  {
    method: 'delete',
    path: '/workforce-users/1',
    pattern: 'removeWorkforceUser',
    roles: adminOnly,
    status: 204,
  },
  {
    method: 'get',
    path: '/accounts',
    pattern: 'findAllAccounts',
    roles: adminOnly,
    status: 200,
  },
  {
    method: 'post',
    path: '/accounts',
    pattern: 'createAccount',
    roles: adminOnly,
    status: 201,
    body: {
      username: 'test27',
      password: 'test-only-password',
      role: AccountRole.VIEWER,
    },
  },
] as const;

// Supertest'in HTTP metotları için daraltılmış, any içermeyen çağrı.
function call(app: INestApplication, method: string, path: string) {
  const http = request(app.getHttpServer());
  switch (method) {
    case 'post':
      return http.post(path);
    case 'patch':
      return http.patch(path);
    case 'delete':
      return http.delete(path);
    default:
      return http.get(path);
  }
}

describe('HTTP rol izinleri — gerçek global guard ve controller akışı', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let swagger: OpenAPIObject;
  const tokens = new Map<AccountRole, string>();
  const send = vi.fn();
  const users = new Map(
    allRoles.map((role, index) => [
      role,
      { id: index + 1, username: role.toLowerCase(), role },
    ]),
  );

  beforeAll(async () => {
    vi.stubEnv('JWT_SECRET', randomBytes(32).toString('hex'));
    const { AppModule } = await import('../../app.module.js');
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [DefaultPolicyController],
    })
      .overrideProvider('WORKFORCE_TCP')
      .useValue({ send, close: vi.fn() })
      .compile();
    app = module.createNestApplication({ logger: false });
    const trace = new HttpLoggingInterceptor();
    app.use(trace.middleware());
    app.useGlobalInterceptors(trace);
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    swagger = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .addBearerAuth(
          { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          'access-token',
        )
        .build(),
    );
    await app.init();
    jwt = app.get(JwtService);
    for (const [role, user] of users)
      tokens.set(role, await jwt.signAsync(user));
  });
  beforeEach(() => {
    send.mockReset();
    send.mockImplementation((pattern: string) =>
      of(pattern === 'ping' ? 'pong' : {}),
    );
  });
  afterAll(async () => {
    if (app) await app.close();
    vi.unstubAllEnvs();
  });

  describe.each(allRoles)('%s', (role) => {
    it.each(routes)('$method $path', async (route) => {
      const allowed = (route.roles as readonly AccountRole[]).includes(role);
      const result = await call(app, route.method, `/api${route.path}`)
        .set('Authorization', `Bearer ${tokens.get(role)}`)
        .send('body' in route ? route.body : undefined);
      expect(result.status).toBe(allowed ? route.status : 403);
      if (allowed) {
        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith(
          route.pattern,
          expect.objectContaining({
            actor: users.get(role),
            correlationId: expect.any(String),
          }),
        );
      } else {
        expect(result.body).toEqual({
          statusCode: 403,
          message: 'Bu işlem için yetkiniz yok',
        });
        expect(send).not.toHaveBeenCalled();
      }
    });

    it('me endpointini kullanabilir', async () => {
      const result = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.get(role)}`);
      expect(result.status).toBe(200);
      expect(result.body).toEqual(users.get(role));
      expect(send).not.toHaveBeenCalled();
    });

    it('Roles olmayan endpoint admin varsayımını uygular', async () => {
      const result = await request(app.getHttpServer())
        .get('/api/policy-default')
        .set('Authorization', `Bearer ${tokens.get(role)}`);
      expect(result.status).toBe(role === AccountRole.ADMIN ? 200 : 403);
    });
  });

  it.each(routes)(
    'token yokken $method $path 401 döner; servis çağrılmaz',
    async (route) => {
      const result = await call(app, route.method, `/api${route.path}`).send(
        'body' in route ? route.body : undefined,
      );
      expect(result.status).toBe(401);
      expect(send).not.toHaveBeenCalled();
    },
  );

  it.each(['bozuk-token', 'expired'])(
    'geçersiz token rol kontrolünden önce 401 verir: %s',
    async (value) => {
      const token =
        value === 'expired'
          ? await jwt.signAsync(users.get(AccountRole.ADMIN)!, {
              expiresIn: -1,
            })
          : value;
      const result = await request(app.getHttpServer())
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);
      expect(result.status).toBe(401);
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('viewer body/query/header ile admin rolü göndererek izni aşamaz', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/teams?role=ADMIN')
      .set('Authorization', `Bearer ${tokens.get(AccountRole.VIEWER)}`)
      .set('X-Role', 'ADMIN')
      .send({
        name: 'Yetkisiz',
        role: 'ADMIN',
        actor: users.get(AccountRole.ADMIN),
      });
    expect(result.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it('health Public kalır; geçersiz token dahi kimlik oluşturmaz', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/health')
      .set('Authorization', 'Bearer bozuk-token');
    expect(result.status).toBe(200);
    expect(result.text).toBe('pong');
    expect(send).toHaveBeenCalledWith(
      'ping',
      expect.objectContaining({ actor: null }),
    );
  });

  it('login token istemez; actor null ile kimlik doğrulamaya gider', async () => {
    const user = users.get(AccountRole.VIEWER)!;
    send.mockReturnValue(of({ ...user, isActive: true }));
    const result = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: user.username, password: 'test-only-password' });
    expect(result.status).toBe(200);
    expect(result.body.user).toEqual(user);
    expect(send).toHaveBeenCalledWith(
      'validateCredentials',
      expect.objectContaining({ actor: null }),
    );
  });

  it('Swagger mevcut tüm endpointler için rolleri ve public istisnaları açıklar', () => {
    for (const route of routes) {
      const path = `/api${route.path.replace('/1', '/{id}').replace('/2', '/{workforceUserId}')}`;
      const item = swagger.paths[path];
      const operation = item?.[route.method];
      expect(operation?.description).toContain(
        `İzin verilen roller: ${route.roles.join(', ')}.`,
      );
      expect(operation?.responses).toHaveProperty('401');
      expect(operation?.responses).toHaveProperty('403');
    }
    expect(swagger.paths['/api/auth/me'].get?.description).toContain(
      'ADMIN, PLANNER, VIEWER',
    );
    for (const [path, method] of [
      ['/api/auth/login', 'post'],
      ['/api/health', 'get'],
    ] as const) {
      expect(swagger.paths[path][method]?.description).toContain(
        'Herkese açık',
      );
      expect(swagger.paths[path][method]?.security).toBeUndefined();
    }
  });
});