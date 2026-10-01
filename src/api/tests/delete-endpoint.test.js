const assert = require('assert');
const http = require('http');
const express = require('express');

const test = require('node:test');

test('DELETE /tasks/:id - should return 204 and delete the task when task exists', async (t) => {
  const app = express();
  app.use(express.json());

  let deleteAttempted = false;
  let selectAttempted = false;

  // Mock db object
  const mockDb = {
    query: async (sql, params) => {
      if (sql.includes('SELECT id FROM tasks WHERE id = $1')) {
        selectAttempted = true;
        return { rows: [{ id: 1 }] };
      }
      if (sql.includes('DELETE FROM tasks WHERE id = $1')) {
        deleteAttempted = true;
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  app.delete('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { rows } = await mockDb.query('SELECT id FROM tasks WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await mockDb.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  });

  return new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const address = server.address();
      const url = `http://localhost:${address.port}/tasks/1`;

      const result = await new Promise((innerResolve) => {
        const req = http.request(url, { method: 'DELETE' }, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            innerResolve({ statusCode: res.statusCode, data });
          });
        });
        req.on('error', (err) => {
          innerResolve({ error: err.message });
        });
        req.end();
      });

      server.close();

      try {
        assert.strictEqual(result.statusCode, 204, 'Should return 204 status code');
        assert.strictEqual(selectAttempted, true, 'Should check if task exists');
        assert.strictEqual(deleteAttempted, true, 'Should delete the task');
        resolve();
      } catch (err) {
        resolve(Promise.reject(err));
      }
    });
  });
});

test('DELETE /tasks/:id - should return 404 when task does not exist', async (t) => {
  const app = express();
  app.use(express.json());

  const mockDb = {
    query: async (sql, params) => {
      if (sql.includes('SELECT id FROM tasks WHERE id = $1')) {
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  app.delete('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { rows } = await mockDb.query('SELECT id FROM tasks WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await mockDb.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  });

  return new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const address = server.address();
      const url = `http://localhost:${address.port}/tasks/999`;

      const result = await new Promise((innerResolve) => {
        const req = http.request(url, { method: 'DELETE' }, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            innerResolve({ statusCode: res.statusCode, data });
          });
        });
        req.on('error', (err) => {
          innerResolve({ error: err.message });
        });
        req.end();
      });

      server.close();

      try {
        assert.strictEqual(result.statusCode, 404, 'Should return 404 status code');
        const body = JSON.parse(result.data);
        assert.deepStrictEqual(body, { error: 'Not found' }, 'Should return error object');
        resolve();
      } catch (err) {
        resolve(Promise.reject(err));
      }
    });
  });
});

test('DELETE /tasks/:id - should parse id as integer', async (t) => {
  const app = express();
  app.use(express.json());

  let parsedId = null;

  const mockDb = {
    query: async (sql, params) => {
      if (sql.includes('SELECT id FROM tasks WHERE id = $1')) {
        parsedId = params[0];
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  app.delete('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { rows } = await mockDb.query('SELECT id FROM tasks WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await mockDb.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  });

  return new Promise((resolve) => {
    const server = app.listen(0, async () => {
      const address = server.address();
      const url = `http://localhost:${address.port}/tasks/42`;

      const result = await new Promise((innerResolve) => {
        const req = http.request(url, { method: 'DELETE' }, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            innerResolve({ statusCode: res.statusCode, data });
          });
        });
        req.on('error', (err) => {
          innerResolve({ error: err.message });
        });
        req.end();
      });

      server.close();

      try {
        assert.strictEqual(parsedId, 42, 'Should parse id as integer');
        assert.strictEqual(typeof parsedId, 'number', 'Should be a number');
        resolve();
      } catch (err) {
        resolve(Promise.reject(err));
      }
    });
  });
});
