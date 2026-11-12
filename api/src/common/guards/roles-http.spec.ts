import { Controller, Get, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import { randomBytes } from 'node:crypto';
import { of, throwError } from 'rxjs';
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
    method: 'patch',
    path: '/work-orders/1/status',
    pattern: 'changeWorkOrderStatus',
    roles: [AccountRole.ADMIN, AccountRole.PLANNER],
    status: 200,
    body: { status: 'ASSIGNED', teamId: 1 },
  },
  {
    method: 'get',
    path: '/work-orders/1/history',
    pattern: 'findWorkOrderHistory',
    roles: allRoles,
    status: 200,
  },
  {
    method: 'post',
    path: '/work-orders',
    pattern: 'createWorkOrder',
    roles: [AccountRole.ADMIN, AccountRole.PLANNER],
    status: 201,
    body: { title: 'Bakım', dueAt: '2099-01-02T10:00:00Z' },
  },
  {
    method: 'get',
    path: '/work-orders/1',
    pattern: 'findOneWorkOrder',
    roles: allRoles,
    status: 200,
  },
  {
    method: 'patch',
    path: '/work-orders/1',
    pattern: 'updateWorkOrder',
    roles: [AccountRole.ADMIN, AccountRole.PLANNER],
    status: 200,
    body: { title: 'Yeni' },
  },
  {
    method: 'post',
    path: '/teams/1/shifts',
    pattern: 'createTeamShifts',
    roles: [AccountRole.ADMIN, AccountRole.PLANNER],
    status: 201,
    body: {
      startAt: '2099-01-02T08:00:00+03:00',
      endAt: '2099-01-02T16:00:00+03:00',
      note: 'Toplu',
    },
  },
  {
    method: 'get',
    path: '/shifts',
    pattern: 'findAllShifts',
    roles: allRoles,
    status: 200,
    query: { from: '2027-01-01T00:00:00Z', to: '2027-01-02T00:00:00Z' },
  },
  {
    method: 'post',
    path: '/shifts',
    pattern: 'createShift',
    roles: [AccountRole.ADMIN, AccountRole.PLANNER],
    status: 201,
    body: {
      workforceUserId: 1,
      startAt: '2099-01-02T05:00:00Z',
      endAt: '2099-01-02T13:00:00Z',
    },
  },
  {
    method: 'get',
    path: '/shifts/1',
    pattern: 'findOneShift',
    roles: allRoles,
    status: 200,
  },
  {
    method: 'patch',
    path: '/shifts/1',
    pattern: 'updateShift',
    roles: [AccountRole.ADMIN, AccountRole.PLANNER],
    status: 200,
    body: { note: null },
  },
  {
    method: 'delete',
    path: '/shifts/1',
    pattern: 'removeShift',
    roles: [AccountRole.ADMIN, AccountRole.PLANNER],
    status: 204,
  },

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
      of(
        pattern === 'ping'
          ? 'pong'
          : pattern === 'findAllShifts'
            ? []
            : pattern === 'findOneWorkOrder'
              ? { id: 1, status: 'OPEN', teamId: null }
              : {},
      ),
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
        .query('query' in route ? route.query : {})
        .send('body' in route ? route.body : undefined);
      expect(result.status).toBe(allowed ? route.status : 403);
      if (allowed) {
        expect(send).toHaveBeenCalledTimes(
          route.pattern === 'changeWorkOrderStatus' ? 2 : 1,
        );
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

  it('vardiya create gövdesindeki actor/createdById silinir; token kimliği TCP zarfında kalır', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/shifts')
      .set('Authorization', `Bearer ${tokens.get(AccountRole.PLANNER)}`)
      .send({
        workforceUserId: 1,
        startAt: '2099-01-02T08:00:00+03:00',
        endAt: '2099-01-02T16:00:00+03:00',
        createdById: 999,
        actor: { id: 999 },
      });
    expect(result.status).toBe(201);
    const envelope = send.mock.calls[0][1];
    expect(envelope.actor).toEqual(users.get(AccountRole.PLANNER));
    expect(envelope.data).not.toHaveProperty('createdById');
    expect(envelope.data).not.toHaveProperty('actor');
  });

  it.each([
    [
      'post',
      {
        workforceUserId: 1,
        startAt: '2099-01-02T08:00:00',
        endAt: '2099-01-02T16:00:00Z',
      },
    ],
    ['patch', { startAt: null }],
    ['patch', { workforceUserId: null }],
  ] as const)(
    'vardiya %s geçersiz DTO ile TCP çağrısından önce 400 verir',
    async (method, body) => {
      const result = await call(
        app,
        method,
        method === 'post' ? '/api/shifts' : '/api/shifts/1',
      )
        .set('Authorization', `Bearer ${tokens.get(AccountRole.PLANNER)}`)
        .send(body);
      expect(result.status).toBe(400);
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('vardiya listesi array döner; query filtreleri TCP verisine sayı olarak taşınır', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/shifts')
      .set('Authorization', `Bearer ${tokens.get(AccountRole.VIEWER)}`)
      .query({
        from: '2027-01-01T00:00:00Z',
        to: '2027-01-02T00:00:00Z',
        workforceUserId: '7',
        teamId: '3',
        limit: '1',
      });
    expect(result.status).toBe(200);
    expect(result.body).toEqual([]);
    expect(send).toHaveBeenCalledWith(
      'findAllShifts',
      expect.objectContaining({
        data: expect.objectContaining({ workforceUserId: 7, teamId: 3 }),
      }),
    );
    expect(send.mock.calls[0][1].data).not.toHaveProperty('limit');
  });

  it.each([
    {},
    { from: '2027-01-01T00:00:00Z' },
    { from: '2027-01-01T00:00:00Z', to: '2027-02-10T00:00:00Z' },
    { from: '2027-01-01T00:00:00Z', to: '2027-01-01T00:00:00Z' },
    { from: '2027-01-01T00:00:00', to: '2027-01-02T00:00:00Z' },
    { from: '2027-01-01T00:00:00Z', to: '2027-01-02T00:00:00Z', teamId: 'abc' },
  ])(
    'vardiya liste filtresi geçersizse 400; TCP çağrılmaz: %j',
    async (query) => {
      const result = await request(app.getHttpServer())
        .get('/api/shifts')
        .set('Authorization', `Bearer ${tokens.get(AccountRole.VIEWER)}`)
        .query(query);
      expect(result.status).toBe(400);
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('toplu vardiyada 409 details listesini HTTP yanıtına kayıpsız taşır', async () => {
    const error = {
      statusCode: 409,
      message: 'Ekip üyelerinin mevcut vardiyalarıyla çakışma var',
      details: [
        {
          workforceUserId: 1,
          registrationNumber: 'P1',
          firstName: 'Deniz',
          lastName: 'Kaya',
        },
        {
          workforceUserId: 2,
          registrationNumber: 'P2',
          firstName: 'Ece',
          lastName: 'Ak',
        },
      ],
    };
    send.mockReturnValue(throwError(() => error));
    const result = await request(app.getHttpServer())
      .post('/api/teams/1/shifts')
      .set('Authorization', `Bearer ${tokens.get(AccountRole.PLANNER)}`)
      .send({
        startAt: '2099-01-02T08:00:00+03:00',
        endAt: '2099-01-02T16:00:00+03:00',
      });
    expect(result.status).toBe(409);
    expect(result.body).toEqual(error);
  });

  it('toplu atamada üye/actor bilgisi bodyden alınmaz; teamId URLden gelir', async () => {
    send.mockReturnValue(of([]));
    const result = await request(app.getHttpServer())
      .post('/api/teams/7/shifts')
      .set('Authorization', `Bearer ${tokens.get(AccountRole.PLANNER)}`)
      .send({
        startAt: '2099-01-02T08:00:00+03:00',
        endAt: '2099-01-02T16:00:00+03:00',
        teamId: 999,
        workforceUserId: 999,
        memberIds: [999],
        createdById: 999,
        actor: { id: 999 },
      });
    expect(result.status).toBe(201);
    expect(result.body).toEqual([]);
    const envelope = send.mock.calls[0][1];
    expect(envelope.actor).toEqual(users.get(AccountRole.PLANNER));
    expect(envelope.data).toEqual({
      teamId: 7,
      startAt: '2099-01-02T08:00:00+03:00',
      endAt: '2099-01-02T16:00:00+03:00',
    });
  });

  it('toplu vardiya DTO hatasında servis çağrılmadan 400 döner', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/teams/1/shifts')
      .set('Authorization', `Bearer ${tokens.get(AccountRole.PLANNER)}`)
      .send({ startAt: 'invalid' });
    expect(result.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('PATCH status/teamId/code/actor alanlarını TCP verisine taşımaz', async () => {
    const result = await request(app.getHttpServer())
      .patch('/api/work-orders/1')
      .set('Authorization', `Bearer ${tokens.get(AccountRole.PLANNER)}`)
      .send({
        title: 'Yeni',
        status: 'COMPLETED',
        teamId: 9,
        code: 'forged',
        createdById: 99,
        actor: { id: 99 },
        version: 99,
      });
    expect(result.status).toBe(200);
    expect(send.mock.calls[0][1].data).toEqual({ id: 1, title: 'Yeni' });
  });
  it('Swagger iş emrinde DELETE tanımlamaz', () => {
    expect(swagger.paths['/api/work-orders/{id}'].delete).toBeUndefined();
  });
  it('DELETE isteğinde handler yoktur ve TCP gönderilmez', async () => {
    const result = await request(app.getHttpServer())
      .delete('/api/work-orders/1')
      .set('Authorization', `Bearer ${tokens.get(AccountRole.ADMIN)}`);
    expect(result.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });
  it.each([
    ['PLANNER', 403],
    ['ADMIN', 200],
  ] as const)('IN_PROGRESS iptalinde %s sonucu %s', async (role, status) => {
    send.mockImplementation((pattern: string) =>
      of(
        pattern === 'findOneWorkOrder' ? { id: 1, status: 'IN_PROGRESS' } : {},
      ),
    );
    const token = tokens.get(
      role === 'ADMIN' ? AccountRole.ADMIN : AccountRole.PLANNER,
    );
    const result = await request(app.getHttpServer())
      .patch('/api/work-orders/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CANCELLED', reason: 'iptal' });
    expect(result.status).toBe(status);
    expect(send).toHaveBeenCalledTimes(status === 403 ? 1 : 2);
    if (status === 200)
      expect(send).toHaveBeenCalledWith(
        'changeWorkOrderStatus',
        expect.objectContaining({
          data: {
            id: 1,
            status: 'CANCELLED',
            reason: 'iptal',
            expectedStatus: 'IN_PROGRESS',
          },
        }),
      );
  });
  it('planner ASSIGNED iptalini yapabilir; sahte expectedStatus kullanılmaz', async () => {
    send.mockImplementation((pattern: string) =>
      of(pattern === 'findOneWorkOrder' ? { id: 1, status: 'ASSIGNED' } : {}),
    );
    const result = await request(app.getHttpServer())
      .patch('/api/work-orders/1/status')
      .set('Authorization', `Bearer ${tokens.get(AccountRole.PLANNER)}`)
      .send({
        status: 'CANCELLED',
        reason: 'iptal',
        expectedStatus: 'IN_PROGRESS',
      });
    expect(result.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      'changeWorkOrderStatus',
      expect.objectContaining({
        data: {
          id: 1,
          status: 'CANCELLED',
          reason: 'iptal',
          expectedStatus: 'ASSIGNED',
        },
      }),
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