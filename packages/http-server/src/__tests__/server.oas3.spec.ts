import { relative, resolve } from 'path';
import { createServer } from '../';
import { IPrismHttpServer } from '../types';

describe('server', () => {
  let server: IPrismHttpServer<any>;

  beforeAll(async () => {
    server = createServer({}, { components: {}, config: { mock: true } });
    await server.prism.load({
      path: relative(
        process.cwd(),
        resolve(__dirname, '..', '..', '..', '..', 'examples', 'petstore.oas3.json')
      ),
    });
  });

  afterAll(() => new Promise(res => server.fastify.close(res)));

  test('should mock back /pets/:petId', async () => {
    const response = await server.fastify.inject({
      method: 'GET',
      url: '/pets/123',
    });

    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload);
    expect(payload).toHaveProperty('id');
    expect(payload).toHaveProperty('name');
    expect(payload).toHaveProperty('tag');
  });

  test('should not mock a verb that is not defined on a path', async () => {
    const response = await server.fastify.inject({
      method: 'POST',
      url: '/pets/123',
    });
    expect(response.statusCode).toBe(500);
  });

  test('will return requested error response with payload', async () => {
    const response = await server.fastify.inject({
      method: 'GET',
      url: '/pets?__code=415',
    });

    expect(response.statusCode).toBe(415);

    const payload = JSON.parse(response.payload);
    expect(payload).toHaveProperty('property');
    expect(payload).toHaveProperty('validationError');
  });

  test('will return the default response when using the __code property with a non existing code', async () => {
    const response = await server.fastify.inject({
      method: 'GET',
      url: '/pets/123?__code=404',
    });

    expect(response.statusCode).toBe(404);
    const payload = JSON.parse(response.payload);
    expect(payload).toHaveProperty('code');
    expect(payload).toHaveProperty('message');
  });

  test('will return 500 with error when an undefined code is requested and there is no default response', async () => {
    const response = await server.fastify.inject({
      method: 'GET',
      url: '/petFood/123?__code=499',
    });

    expect(response.statusCode).toBe(500);
  });

  test('should not mock a request that is missing the required query parameters with no default', async () => {
    const response = await server.fastify.inject({
      method: 'GET',
      url: '/findPetByName',
    });

    expect(response.statusCode).toBe(400);
  });

  test.skip('should automagically provide the parameters when not provided in the query string and a default is defined', async () => {
    const response = await server.fastify.inject({
      method: 'GET',
      url: '/pets/findByStatus',
    });

    expect(response.statusCode).toBe(200);
  });

  test('should support multiple param values', async () => {
    const response = await server.fastify.inject({
      method: 'GET',
      url: '/pets/findByStatus?status=available&status=sold',
    });

    expect(response.statusCode).toBe(200);
  });

  test('should validate the body params and return a 2XX response', async () => {
    const response = await server.fastify.inject({
      method: 'POST',
      url: '/pets',
      payload: {
        id: 1,
        name: 'bobby',
      },
    });

    expect(response.statusCode).toBe(201);
  });

  test('should validate the body params and return an error code', async () => {
    const response = await server.fastify.inject({
      method: 'POST',
      url: '/pets',
      payload: {
        id: 1,
        petId: 2,
        quantity: 3,
        shipDate: '12-01-2018',
        status: 'placed',
        complete: true,
      },
    });
    expect(response.statusCode).toBe(400);
  });
});
