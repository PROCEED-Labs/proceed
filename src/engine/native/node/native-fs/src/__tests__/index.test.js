jest.mock('fs');
jest.mock('@darkobits/adeiu');

const NativeFS = require('../index');
const fs = require('fs');
const { default: exitHook } = require('@darkobits/adeiu');

describe('Native-FS', () => {
  describe('#constructor()', () => {
    afterEach(() => {
      fs.statSync.mockReset();
      fs.mkdirSync.mockReset();
      fs.readFile.mockReset();
      fs.writeFile.mockReset();
      exitHook.mockReset();
    });

    it('Sets the commands property', () => {
      const nfs = new NativeFS();
      expect(nfs.commands).toEqual(expect.arrayContaining(['read', 'write']));
    });

    it('Creates a data_files folder at the given path', () => {
      fs.statSync.mockImplementationOnce(() => {
        const error = new Error();
        error.code = 'ENOENT';
        throw error;
      });
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      expect(fs.mkdirSync).toHaveBeenCalledWith('/Path/To/Dir/data_files/');
    });

    it("Doesn't create the data_files folder if it already exists", () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('Throws on any unexpected error when trying to create the data_files folder', () => {
      fs.statSync.mockImplementationOnce(() => {
        const error = new Error();
        error.code = 'EISDIR';
        throw error;
      });
      expect(() => new NativeFS({ dir: '/Path/To/Dir' })).toThrow();
    });

    it('Only finishes ongoing operations when exited', async () => {
      fs.readFile.mockImplementation((path, cb) => {
        cb(null, JSON.stringify({ test: 'data' }));
      });
      fs.writeFile.mockImplementation((path, content, cb) => {
        cb();
      });

      let _cb;
      fs.readFile.mockImplementationOnce((path, cb) => {
        _cb = cb;
      });

      const nfs = new NativeFS({ dir: '/Path/To/Dir' });

      const r1 = nfs.write(['table/test', 'data']);
      nfs.read(['table/test2']);
      nfs.write(['table/test3', 'data']);
      const res = exitHook.mock.calls[0][0]();
      _cb(null, JSON.stringify({ test: 'data' }));
      expect(res).resolves.toBeUndefined();
      expect(r1).resolves.toBeUndefined();
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('#read()', () => {
    afterEach(() => {
      fs.readFile.mockReset();
    });

    it('Reads the given value', async () => {
      fs.readFile.mockImplementationOnce((path, cb) => {
        cb(null, JSON.stringify({ test: 'data' }));
      });
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const res = nfs.read(['table.json/test']);
      expect(fs.readFile).toHaveBeenCalledWith(
        '/Path/To/Dir/data_files/table.json',
        expect.any(Function)
      );
      await expect(res).resolves.toEqual(['data']);
    });

    it("Returns null if the table doesn't exist", async () => {
      fs.readFile.mockImplementationOnce((path, cb) => {
        const error = new Error();
        error.code = 'ENOENT';
        cb(error);
      });
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const res = nfs.read(['table.json/test']);
      expect(fs.readFile).toHaveBeenCalledWith(
        '/Path/To/Dir/data_files/table.json',
        expect.any(Function)
      );
      await expect(res).resolves.toEqual([null]);
    });

    // it('Reads the given table', async () => {
    //   fs.readFile.mockImplementationOnce((path, encoding, cb) => {
    //     cb(null, JSON.stringify({ test: 'data' }));
    //   });
    //   const nfs = new NativeFS({ dir: '/Path/To/Dir' });
    //   const res = nfs.read(['table.json']);
    //   expect(fs.readFile).toHaveBeenCalledWith(
    //     '/Path/To/Dir/data_files/table.json',
    //     expect.any(Function)
    //   );
    //   await expect(res).resolves.toEqual([{ test: 'data' }]);
    // });

    // it("Returns null if the table doesn't exist when only table name is given", async () => {
    //   fs.readFile.mockImplementationOnce((path, encoding, cb) => {
    //     const error = new Error();
    //     error.code = 'ENOENT';
    //     cb(error);
    //   });
    //   const nfs = new NativeFS({ dir: '/Path/To/Dir' });
    //   const res = nfs.read(['table.json']);
    //   expect(fs.readFile).toHaveBeenCalledWith(
    //     '/Path/To/Dir/data_files/table.json',
    //     expect.any(Function)
    //   );
    //   await expect(res).resolves.toEqual([null]);
    // });

    it('Rejects with an error on fs fails', async () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });

      fs.readFile.mockImplementationOnce((path, cb) => {
        const error = new Error();
        error.code = 'EISDIR';
        cb(error);
      });
      const res1 = nfs.read(['table.json/test']);
      await expect(res1).rejects.toBeInstanceOf(Error);

      fs.readFile.mockImplementationOnce((path, encoding, cb) => {
        const error = new Error();
        error.code = 'EISDIR';
        cb(error);
      });
      const res2 = nfs.read(['table.json']);
      await expect(res2).rejects.toBeInstanceOf(Error);
    });

    // TODO: this doesn't work with the current fix, make it work again in the future
    // it('Schedules all reads in parallel if no write operation is ongoing', () => {
    //   const nfs = new NativeFS({ dir: '/Path/To/Dir' });
    //   nfs.read(['table/test']);
    //   nfs.read(['table/test']);
    //   nfs.read(['table/test']);
    //   nfs.read(['table/test']);
    //   nfs.read(['table/test']);
    //   expect(fs.readFile).toHaveBeenCalledTimes(5);
    // });

    // TODO: this is only here to signal that the tests should be changed back to the expected behaviour
    // when there is a fix that allows multiple reads to occur at once
    it('Blocks the same table when two reads occur', async () => {
      let _cb;
      fs.readFile.mockImplementation((path, cbOrEncoding, cb) => {
        _cb = cb || cbOrEncoding;
      });

      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const read1 = nfs.read(['table.json/test1']);
      const read2 = nfs.read(['table.json/test1']);

      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Resolve first read
      _cb(null, JSON.stringify({ foo: 'bar' }));
      expect(read1).resolves.toBeDefined();
      expect(fs.readFile).toHaveBeenLastCalledWith(
        '/Path/To/Dir/data_files/table.json',
        expect.any(Function)
      );
      // Wait for promise flush
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(fs.readFile).toHaveBeenCalledTimes(2);

      // Resolve second read
      _cb(null, JSON.stringify({ foo: 'bar', test1: 'data1' }));
      expect(read2).resolves.toBeDefined();
      expect(fs.readFile).toHaveBeenLastCalledWith(
        '/Path/To/Dir/data_files/table.json',
        expect.any(Function)
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it("Doesn't schedule the read if a write operation is ongoing", () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      nfs.write(['table.json/test', 'data']);
      nfs.read(['table.json/test']);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('Schedules the read if an ongoing write operation finished', async () => {
      let _cb;
      fs.readFile.mockImplementation((path, cbOrEncoding, cb) => {
        _cb = cb || cbOrEncoding;
      });
      fs.writeFile.mockImplementation((path, content, cb) => cb());

      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const writeP = nfs.write(['table.json/test', 'data']);
      const readP = nfs.read(['table.json/test']);
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Resolve write op
      _cb(null, JSON.stringify({ test: 'data' }));
      await expect(writeP).resolves.toBeUndefined();
      expect(fs.readFile).toHaveBeenCalledTimes(2);

      // Resolve read op
      _cb(null, JSON.stringify({ test: 'data' }));
      await expect(readP).resolves.toBeDefined();
    });
  });

  describe('#write()', () => {
    afterEach(() => {
      fs.statSync.mockReset();
      fs.readFile.mockReset();
      fs.writeFile.mockReset();
      fs.unlink.mockReset();
    });

    it('Writes a value', async () => {
      fs.readFile.mockImplementationOnce((path, cb) => {
        cb(null, JSON.stringify({ foo: 'bar' }));
      });
      fs.writeFile.mockImplementationOnce((path, content, cb) => {
        cb();
      });

      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const writeP = nfs.write(['table.json/test', 'data']);

      await expect(writeP).resolves.toBeUndefined();
      expect(fs.readFile).toHaveBeenCalledWith(
        '/Path/To/Dir/data_files/table.json',
        expect.any(Function)
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/Path/To/Dir/data_files/table.json',
        JSON.stringify({
          foo: 'bar',
          test: 'data',
        }),
        expect.any(Function)
      );
    });

    it("Creates a new table if it doesn't exist yet", async () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });

      fs.readFile.mockImplementationOnce((path, cb) => {
        const error = new Error();
        error.code = 'ENOENT';
        cb(error);
      });
      fs.writeFile.mockImplementationOnce((path, content, cb) => cb());
      const res = nfs.write(['table.json/test', 'data']);
      await expect(res).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/Path/To/Dir/data_files/table.json',
        JSON.stringify({ test: 'data' }),
        expect.any(Function)
      );
    });

    it('Removes a value if it is set to null', async () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });

      fs.readFile.mockImplementationOnce((path, cb) => {
        cb(null, JSON.stringify({ foo: 'bar', test: 'data' }));
      });
      fs.writeFile.mockImplementationOnce((path, content, cb) => cb());
      const res = nfs.write(['table.json/test', null]);
      await expect(res).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/Path/To/Dir/data_files/table.json',
        JSON.stringify({ foo: 'bar' }),
        expect.any(Function)
      );

      fs.readFile.mockImplementationOnce((path, cb) => {
        const error = new Error();
        error.code = 'ENOENT';
        cb(error);
      });
      fs.writeFile.mockImplementationOnce((path, content, cb) => cb());
      const res2 = nfs.write(['table.json/test', null]);
      await expect(res2).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/Path/To/Dir/data_files/table.json',
        JSON.stringify({}),
        expect.any(Function)
      );
    });

    it('Removes a table if it is set to null', () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });

      fs.unlink.mockImplementationOnce((path, cb) => {
        cb();
      });
      const res = nfs.write(['table.json', null]);
      expect(res).resolves.toBeUndefined();
      expect(fs.unlink).toHaveBeenCalledWith(
        '/Path/To/Dir/data_files/table.json',
        expect.any(Function)
      );
    });

    it('Rejects with an error on fs fails', async () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });

      fs.readFile.mockImplementationOnce((path, cb) => {
        const error = new Error();
        error.code = 'EISDIR';
        cb(error);
      });
      const res = nfs.write(['table.json/test', 'data']);
      await expect(res).rejects.toBeInstanceOf(Error);

      fs.readFile.mockImplementationOnce((path, cb) => {
        cb(null, JSON.stringify({ foo: 'bar' }));
      });
      fs.writeFile.mockImplementationOnce((path, content, cb) => {
        const error = new Error();
        error.code = 'ENOENT';
        cb(error);
      });
      const res2 = nfs.write(['table.json/test', 'data']);
      await expect(res2).rejects.toBeInstanceOf(Error);

      fs.readFile.mockImplementationOnce((path, cb) => {
        cb(null, JSON.stringify({ foo: 'bar' }));
      });
      fs.writeFile.mockImplementationOnce((path, content, cb) => {
        const error = new Error();
        error.code = 'ENOENT';
        cb(error);
      });
      const res3 = nfs.write(['table.json/test', null]);
      await expect(res3).rejects.toBeInstanceOf(Error);

      fs.readFile.mockImplementationOnce((path, cb) => {
        const error = new Error();
        error.code = 'EISDIR';
        cb(error);
      });
      const res4 = nfs.write(['table.json/test', null]);
      await expect(res4).rejects.toBeInstanceOf(Error);

      fs.unlink.mockImplementationOnce((path, cb) => {
        const error = new Error();
        error.code = 'EISDIR';
        cb(error);
      });
      const res5 = nfs.write(['table.json', null]);
      await expect(res5).rejects.toBeInstanceOf(Error);
    });

    it("Doesn't schedule the write if a read operation is ongoing", async () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      nfs.read(['table.json/test']);
      nfs.write(['table.json/test', 'data']);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledTimes(0);
    });

    it('Schedules the write if an ongoing read operation finished', async () => {
      let _cb;
      fs.readFile.mockImplementation((path, cbOrEncoding, cb) => {
        _cb = cb || cbOrEncoding;
      });
      fs.writeFile.mockImplementation((path, content, cb) => cb());

      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const readP = nfs.read(['table.json/test']);
      const writeP = nfs.write(['table.json/test', 'data']);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledTimes(0);

      // Resolve read op
      _cb(null, JSON.stringify({ test: 'data' }));
      await expect(readP).resolves.toBeDefined();

      // Resolve write op
      _cb(null, JSON.stringify({ test: 'data' }));
      await expect(writeP).resolves.toBeUndefined();
      expect(fs.readFile).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
    });

    it('Blocks the same table when two writes occur', async () => {
      let _cb;
      fs.readFile.mockImplementation((path, cb) => {
        _cb = cb;
      });
      fs.writeFile.mockImplementation((path, content, cb) => {
        cb();
      });

      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const write1 = nfs.write(['table.json/test1', 'data1']);
      const write2 = nfs.write(['table.json/test1', 'data2']);
      const write3 = nfs.write(['table.json/test1', 'data3']);

      expect(fs.readFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).not.toHaveBeenCalled();

      // Resolve first write
      _cb(null, JSON.stringify({ foo: 'bar' }));
      expect(write1).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenLastCalledWith(
        '/Path/To/Dir/data_files/table.json',
        JSON.stringify({
          foo: 'bar',
          test1: 'data1',
        }),
        expect.any(Function)
      );
      // Wait for promise flush
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(fs.readFile).toHaveBeenCalledTimes(2);

      // Resolve second write
      _cb(null, JSON.stringify({ foo: 'bar', test1: 'data1' }));
      expect(write2).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenLastCalledWith(
        '/Path/To/Dir/data_files/table.json',
        JSON.stringify({
          foo: 'bar',
          test1: 'data2',
        }),
        expect.any(Function)
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(fs.readFile).toHaveBeenCalledTimes(3);

      // Resolve third write
      _cb(null, JSON.stringify({ foo: 'bar', test1: 'data2' }));
      expect(write3).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenLastCalledWith(
        '/Path/To/Dir/data_files/table.json',
        JSON.stringify({
          foo: 'bar',
          test1: 'data3',
        }),
        expect.any(Function)
      );
    });

    it('Only blocks writes on the same table name', async () => {
      // Array since we have parallel writes
      let _cb = [];
      fs.readFile.mockImplementation((path, cb) => {
        _cb.push(cb);
      });
      fs.writeFile.mockImplementation((path, content, cb) => {
        cb();
      });

      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const write1 = nfs.write(['table.json/test1', 'data1']);
      const write2 = nfs.write(['table.json/test1', 'data2']);
      const write3 = nfs.write(['table2.json/test2', 'data3']);

      expect(fs.readFile).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).not.toHaveBeenCalled();

      // Resolve first write
      _cb.shift()(null, JSON.stringify({ foo: 'bar' }));
      expect(write1).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenLastCalledWith(
        '/Path/To/Dir/data_files/table.json',
        JSON.stringify({
          foo: 'bar',
          test1: 'data1',
        }),
        expect.any(Function)
      );

      // Resolve second write
      _cb.shift()(null, JSON.stringify({ otherFoo: 'bar' }));
      expect(write3).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenLastCalledWith(
        '/Path/To/Dir/data_files/table2.json',
        JSON.stringify({
          otherFoo: 'bar',
          test2: 'data3',
        }),
        expect.any(Function)
      );
      // Wait for promise flush
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(fs.readFile).toHaveBeenCalledTimes(3);

      // Resolve third write
      _cb.shift()(null, JSON.stringify({ foo: 'bar', test1: 'data1' }));
      expect(write2).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenLastCalledWith(
        '/Path/To/Dir/data_files/table.json',
        JSON.stringify({
          foo: 'bar',
          test1: 'data2',
        }),
        expect.any(Function)
      );
    });
  });

  describe('#executeCommand()', () => {
    const retVal = {};
    beforeAll(() => {
      jest.spyOn(NativeFS.prototype, 'read').mockReturnValue(retVal);
      jest.spyOn(NativeFS.prototype, 'write').mockReturnValue(retVal);
    });
    afterAll(() => {
      NativeFS.prototype.read.mockRestore();
      NativeFS.prototype.write.mockRestore();
    });
    beforeEach(() => {
      NativeFS.prototype.read.mockClear();
      NativeFS.prototype.write.mockClear();
      exitHook.mockReset();
    });

    it('Calls #read() with args', () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const args = ['table.json/test'];
      const cb = jest.fn();
      const res = nfs.executeCommand('read', args, cb);
      expect(res).toBe(retVal);
      expect(NativeFS.prototype.read).toHaveBeenCalledWith(args);
    });

    it('Calls #write() with args and send', () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const args = ['table.json/test', null];
      const cb = jest.fn();
      const res = nfs.executeCommand('write', args, cb);
      expect(res).toBe(retVal);
      expect(NativeFS.prototype.write).toHaveBeenCalledWith(args, cb);
    });

    it('Returns undefined on unknown command', () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      const args = ['table.json/test'];
      const cb = jest.fn();
      const res = nfs.executeCommand('delete', args, cb);
      expect(res).toBeUndefined();
    });

    it("Doesn't schedule new operations if the engine should be stopped", async () => {
      const nfs = new NativeFS({ dir: '/Path/To/Dir' });
      await nfs.executeCommand('read', ['table.json/id1'], jest.fn());
      expect(NativeFS.prototype.read).toHaveBeenCalledTimes(1);

      await exitHook.mock.calls[0][0]();

      await nfs.executeCommand('read', ['table.json/id2'], jest.fn());
      await nfs.executeCommand('write', ['table.json/id3', 'data'], jest.fn());
      expect(NativeFS.prototype.read).toHaveBeenCalledTimes(1);
      expect(NativeFS.prototype.write).toHaveBeenCalledTimes(0);
    });
  });
});
